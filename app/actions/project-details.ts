"use server"

import { createClient } from "@/lib/supabase/server"

// Constantes pour les statuts de lancement
const launchStatus = {
  PAYMENT_PENDING: "payment_pending",
  PAYMENT_FAILED: "payment_failed",
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  LAUNCHED: "launched",
} as const

interface ProjectBySlugResult {
  id: string
  slug: string
  name: string
  description: string | null
  logo_url: string
  website_url: string | null
  launch_status: string
  launch_type: string | null
  scheduled_launch_date: string | null
  created_at: string
  categories: { id: string; name: string }[]
  upvoteCount: number
  creator: { id: string; name: string; email: string; image: string | null } | null
  [key: string]: unknown
}

// Get project by slug
export async function getProjectBySlug(slug: string): Promise<ProjectBySlugResult | null> {
  const supabase = await createClient()

  const { data: projectData } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .neq("launch_status", launchStatus.PAYMENT_PENDING)
    .limit(1)
    .single()

  if (!projectData) {
    return null
  }

  let creator = null
  if (projectData.created_by) {
    const { createClient: createServiceClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: creatorData } = await supabaseAdmin.auth.admin.getUserById(projectData.created_by)

    if (creatorData?.user) {
      creator = {
        id: creatorData.user.id,
        name: creatorData.user.user_metadata?.full_name || creatorData.user.email,
        email: creatorData.user.email,
        image: creatorData.user.user_metadata?.avatar_url,
      }
    }
  }

  const { data: rawCategories } = await supabase
    .from("project_to_category")
    .select("categories(id, name)")
    .eq("project_id", projectData.id)

  const categories = rawCategories as
    | { categories: { id: string; name: string } | { id: string; name: string }[] }[]
    | null

  const formattedCategories = (categories || [])
    .map((pc) => {
      const cats = pc.categories
      if (Array.isArray(cats)) return cats
      return [{ id: cats.id, name: cats.name }]
    })
    .flat()

  const { count: upvoteCount } = await supabase
    .from("upvotes")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectData.id)

  return {
    ...projectData,
    categories: formattedCategories,
    upvoteCount: Number(upvoteCount || 0),
    creator,
  }
}

// Check if a user has upvoted a project
export async function hasUserUpvoted(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return false
  }

  const { data: userUpvotes } = await supabase
    .from("upvotes")
    .select("id")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .limit(1)

  return (userUpvotes && userUpvotes.length > 0) || false
}

// Update project description and categories
export async function updateProject(
  projectId: string,
  data: {
    description: string
    categories: string[]
  },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return { success: false, error: "Authentication required" }
  }

  try {
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, created_by, launch_status, slug")
      .eq("id", projectId)
      .limit(1)
      .single()

    if (!projectData) {
      return { success: false, error: "Project not found" }
    }

    if (projectData.created_by !== user.id) {
      return {
        success: false,
        error: "You don't have permission to edit this project",
      }
    }

    if (projectData.launch_status !== "scheduled") {
      return {
        success: false,
        error: "You can only edit projects that are in scheduled status",
      }
    }

    const { error: updateError } = await supabase
      .from("projects")
      .update({ description: data.description })
      .eq("id", projectId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    await supabase.from("project_to_category").delete().eq("project_id", projectId)

    if (data.categories.length > 0) {
      const categoryInserts = data.categories.map((catId) => ({
        project_id: projectId,
        category_id: catId,
      }))

      const { error: catError } = await supabase.from("project_to_category").insert(categoryInserts)

      if (catError) {
        return { success: false, error: catError.message }
      }
    }

    return { success: true }
  } catch (err) {
    console.error("Error updating project:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}

// Delete a project (only owner, only if not yet launched)
export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return { success: false, error: "Authentication required" }
  }

  try {
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, created_by, launch_status")
      .eq("id", projectId)
      .limit(1)
      .single()

    if (!projectData) {
      return { success: false, error: "Project not found" }
    }

    if (projectData.created_by !== user.id) {
      return {
        success: false,
        error: "You don't have permission to delete this project",
      }
    }

    if (projectData.launch_status === "ongoing" || projectData.launch_status === "launched") {
      return {
        success: false,
        error: "You cannot delete a project that is already launched",
      }
    }

    await supabase.from("project_to_category").delete().eq("project_id", projectId)

    const { error: deleteError } = await supabase.from("projects").delete().eq("id", projectId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (err) {
    console.error("Error deleting project:", err)
    return { success: false, error: "An unexpected error occurred" }
  }
}
