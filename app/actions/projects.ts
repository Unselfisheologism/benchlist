"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

// Fonction pour générer un slug unique
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const supabase = await createClient()

  // Vérifier si le slug existe déjà dans la table projects
  const { data: existingProject } = await supabase
    .from("projects")
    .select("id")
    .eq("slug", baseSlug)
    .limit(1)
    .single()

  if (!existingProject) {
    return baseSlug
  }

  // Si le slug existe, ajouter un nombre aléatoire
  const randomSuffix = Math.floor(Math.random() * 10000)
  return `${baseSlug}-${randomSuffix}`
}

// Get all categories
export async function getAllCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase.from("categories").select("id, name, slug").order("name")
  return (data as { id: string; name: string; slug: string }[]) || []
}

// Get top categories based on project count
export async function getTopCategories(limit = 5) {
  const supabase = await createClient()

  // Récupérer les catégories avec le nombre de projets
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, project_to_category(project_id)")

  if (!categories) return []

  // Compter les projets par catégorie (ongoing ou launched)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, launch_status")
    .in("launch_status", ["ongoing", "launched"])

  const projects_list = (projects ?? []) as { id: string }[]
  const projectIds = new Set(projects_list.map((p) => p.id))

  const cats_list = (categories || []) as {
    id: string
    name: string
    project_to_category: { project_id: string }[]
  }[]
  const categoriesWithCount = cats_list
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      count: cat.project_to_category.filter((pc: { project_id: string }) =>
        projectIds.has(pc.project_id),
      ).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return categoriesWithCount
}

// Get user's upvoted projects
export async function getUserUpvotedProjects() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return []
  }

  const { data: upvotes } = await supabase
    .from("upvotes")
    .select("project_id, created_at, projects(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  if (!upvotes) return []
  const upvotes_list = upvotes as { project_id: string; created_at: string; projects: unknown }[]
  return upvotes_list.map((uv) => {
    const proj = Array.isArray(uv.projects) ? uv.projects[0] : uv.projects
    return {
      project: proj,
      upvotedAt: uv.created_at,
    }
  })
}

// La fonction getUserComments ne devrait plus être nécessaire car gérée par Fuma Comment
export async function getUserComments() {
  return []
}

// Get projects created by user
export async function getUserCreatedProjects() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return []
  }

  const { data: userProjects } = await supabase
    .from("projects")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  return userProjects || []
}

// Toggle upvote on a project
export async function toggleUpvote(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return {
      success: false,
      message: "You must be logged in to upvote",
    }
  }

  // Importer les constantes et le module de rate limiting
  const { UPVOTE_LIMITS } = await import("@/lib/constants")
  const rateLimit = await import("@/lib/rate-limit")

  // Rate limiting pour les upvotes en utilisant les constantes
  const { success, reset } = await rateLimit.checkRateLimit(
    `upvote:${user.id}`,
    UPVOTE_LIMITS.ACTIONS_PER_WINDOW,
    UPVOTE_LIMITS.TIME_WINDOW_MS,
  )

  if (!success) {
    return {
      success: false,
      message: `Anti-Spam Squad here: ${UPVOTE_LIMITS.ACTIONS_PER_WINDOW} upvotes in ${UPVOTE_LIMITS.TIME_WINDOW_MINUTES} minutes maxed out! Retry in ${reset} seconds.`,
    }
  }

  // Vérifier si l'utilisateur a déjà fait une action sur ce project récemment
  const { data: lastAction } = await supabase
    .from("upvotes")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  // Si une action existe et a été créée il y a moins de X secondes (défini dans les constantes), bloquer
  if (lastAction?.created_at) {
    const timeSinceLastAction = Date.now() - new Date(lastAction.created_at).getTime()
    if (timeSinceLastAction < UPVOTE_LIMITS.MIN_TIME_BETWEEN_ACTIONS_MS) {
      return {
        success: false,
        message: `Anti-Spam Squad here: ${UPVOTE_LIMITS.MIN_TIME_BETWEEN_ACTIONS_SECONDS}-second wait required for vote changes`,
      }
    }
  }

  // Check if the user has already upvoted the project
  const { data: existingUpvote } = await supabase
    .from("upvotes")
    .select("id")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .limit(1)

  // If upvote exists, remove it, otherwise add it
  if (existingUpvote && existingUpvote.length > 0) {
    await supabase.from("upvotes").delete().eq("user_id", user.id).eq("project_id", projectId)
  } else {
    await supabase.from("upvotes").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      project_id: projectId,
      created_at: new Date().toISOString(),
    })
  }

  revalidatePath("/dashboard")
  // Temporairement commenter la revalidation spécifique au projet
  // Il faudrait le slug ici pour revalider /projects/{slug}
  // revalidatePath(`/projects/${projectSlug}`);

  return { success: true }
}

// Définir l'interface ici
interface ProjectSubmissionData {
  name: string
  description: string
  websiteUrl: string
  logoUrl: string
  productImage: string | null
  categories: string[]
  techStack: string[]
  platforms: string[]
  pricing: string
  githubUrl?: string | null
  twitterUrl?: string | null
  sourceUrl?: string | null
  paperUrl?: string | null
}

// Version correcte de submitProject
export async function submitProject(projectData: ProjectSubmissionData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Authentication required" }
  }

  try {
    // Utiliser les données de projectData
    const {
      name,
      description,
      websiteUrl,
      logoUrl,
      productImage,
      categories,
      techStack,
      platforms,
      pricing,
      githubUrl,
      twitterUrl,
      sourceUrl,
      paperUrl,
    } = projectData

    // Validation
    if (!name || !description || !websiteUrl || !logoUrl || categories.length === 0) {
      return { success: false, error: "Missing required fields" }
    }

    // Générer le slug à partir du nom dans projectData
    const slug = await generateUniqueSlug(name)

    // Insérer le projet
    const { data: newProject, error: insertError } = await supabase
      .from("projects")
      .insert({
        id: crypto.randomUUID(),
        name,
        slug,
        description,
        website_url: websiteUrl,
        logo_url: logoUrl,
        product_image: productImage ?? undefined,
        tech_stack: techStack,
        platforms,
        pricing,
        github_url: githubUrl ?? undefined,
        twitter_url: twitterUrl ?? undefined,
        source_url: sourceUrl ?? undefined,
        paper_url: paperUrl ?? undefined,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, slug")
      .single()

    if (insertError) {
      console.error("Error inserting project:", insertError)
      return { success: false, error: "Failed to submit project" }
    }

    // Ajouter les catégories
    if (categories.length > 0 && newProject) {
      await supabase.from("project_to_category").insert(
        categories.map((categoryId) => ({
          project_id: newProject.id,
          category_id: categoryId,
        })),
      )
    }

    return { success: true, projectId: newProject.id, slug: newProject.slug }
  } catch (error) {
    console.error("Error submitting project:", error)
    return { success: false, error: "Failed to submit project" }
  }
}

async function enrichProjectsWithUserData<T extends { id: string }>(
  projects: T[],
  userId: string | null,
): Promise<
  (T & {
    userHasUpvoted: boolean
    categories: { id: string; name: string }[]
  })[]
> {
  if (!projects.length) return []

  const projectIds = projects.map((p) => p.id)
  const supabase = await createClient()

  // Récupérer les catégories pour tous les projets
  const { data: projectCategories } = await supabase
    .from("project_to_category")
    .select("project_id, category_id, categories(id, name)")
    .in("project_id", projectIds)

  const categoriesByProjectId = (projectCategories || []).reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (acc: Record<string, { id: string; name: string }[]>, row: any) => {
      if (!acc[row.project_id]) {
        acc[row.project_id] = []
      }
      const cats = row.categories as
        { id: string; name: string } | { id: string; name: string }[] | null
      if (cats) {
        if (Array.isArray(cats)) {
          acc[row.project_id].push(...cats)
        } else {
          acc[row.project_id].push(cats)
        }
      }
      return acc
    },
    {} as Record<string, { id: string; name: string }[]>,
  )

  // Récupérer les upvotes de l'utilisateur
  let userUpvotedProjectIds = new Set<string>()
  if (userId) {
    const { data: userUpvotes } = await supabase
      .from("upvotes")
      .select("project_id")
      .eq("user_id", userId)
      .in("project_id", projectIds)

    userUpvotedProjectIds = new Set(
      (userUpvotes || []).map((uv: { project_id: string }) => uv.project_id),
    )
  }

  return projects.map((project) => ({
    ...project,
    userHasUpvoted: userUpvotedProjectIds.has(project.id),
    categories: categoriesByProjectId[project.id] || [],
  }))
}

// Get projects by category with pagination and sorting
export async function getProjectsByCategory(
  categoryId: string,
  page: number = 1,
  limit: number = 10,
  sort: string = "recent",
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = user?.id || null
  const offset = (page - 1) * limit

  // Get project IDs in this category with ongoing or launched status
  const { data: categoryProjects } = await supabase
    .from("project_to_category")
    .select("project_id")
    .eq("category_id", categoryId)

  if (!categoryProjects || categoryProjects.length === 0) {
    return { projects: [], totalCount: 0 }
  }

  const projectIds = categoryProjects.map((cp: { project_id: string }) => cp.project_id)

  // Get projects with launch_status filter
  let query = supabase
    .from("projects")
    .select(
      "id, name, slug, description, logo_url, website_url, launch_status, launch_type, daily_ranking, scheduled_launch_date, created_at",
    )
    .in("id", projectIds)
    .in("launch_status", ["ongoing", "launched"])

  // Apply sorting
  switch (sort) {
    case "alphabetical":
      query = query.order("name", { ascending: true })
      break
    case "recent":
    default:
      query = query.order("created_at", { ascending: false })
      break
  }

  // Get total count first
  const { count: totalCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .in("id", projectIds)
    .in("launch_status", ["ongoing", "launched"])

  // Get paginated projects
  interface ProjectRow {
    id: string
    name: string
    slug: string
    description: string
    logo_url: string
    website_url: string
    launch_status: string
    launch_type: string
    daily_ranking: number | null
    scheduled_launch_date: string | null
    created_at: string
  }
  const { data: projectsData } = (await query.range(offset, offset + limit - 1)) as {
    data: ProjectRow[] | null
  }

  // For upvote sorting, we need to get upvote counts
  if (sort === "upvotes" && projectsData && projectsData.length > 0) {
    const projectIdsForSort = projectsData.map((p) => p.id)
    const { data: upvotes } = await supabase
      .from("upvotes")
      .select("project_id")
      .in("project_id", projectIdsForSort)

    const upvoteCounts = (upvotes || []).reduce(
      (acc: Record<string, number>, uv: { project_id: string }) => {
        acc[uv.project_id] = (acc[uv.project_id] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Sort by upvote count descending
    projectsData.sort((a, b) => (upvoteCounts[b.id] || 0) - (upvoteCounts[a.id] || 0))
  }

  // Get upvote counts for all projects
  const projectsWithUpvotes = await Promise.all(
    (projectsData || []).map(async (proj) => {
      const { count } = await supabase
        .from("upvotes")
        .select("id", { count: "exact", head: true })
        .eq("project_id", proj.id)
      return { ...proj, upvoteCount: count || 0 }
    }),
  )

  const enrichedProjects = await enrichProjectsWithUserData(projectsWithUpvotes, userId)

  return {
    projects: enrichedProjects,
    totalCount: totalCount || 0,
  }
}

// getCategoryById
export async function getCategoryById(categoryId: string) {
  const supabase = await createClient()
  const { data: categoryData } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .limit(1)
    .single()

  return categoryData || null
}
