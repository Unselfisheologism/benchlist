"use server"

import { revalidatePath } from "next/cache"

import { checkAdminAccess, createAdminClient, getAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function getAdminStats() {
  const supabase = getAdminClient()
  await checkAdminAccess()

  // Get all users, sorted by registration date descending
  const { data, error: usersError } = await supabase
    .from("user")
    .select("id, email, full_name, avatar_url, created_at, updated_at, role")
    .order("created_at", { ascending: false })
  const usersData = data as
    | {
        id: string
        email: string
        full_name: string
        avatar_url: string
        created_at: string
        updated_at: string
        role: string | null
      }[]
    | null

  if (usersError) throw usersError

  // Get project counts for each user
  const { data: projectCountsData, error: pcError } = await supabase
    .from("project")
    .select("created_by")
    .not("created_by", "is", null)

  if (pcError) throw pcError

  // Compute project count map
  const countMap = new Map<string, number>()
  for (const row of projectCountsData ?? []) {
    const uid = row.created_by as string
    countMap.set(uid, (countMap.get(uid) ?? 0) + 1)
  }

  // Combine user data with project counts
  const users = (usersData ?? []).map((u) => ({
    ...u,
    hasLaunched: (countMap.get(u.id) || 0) > 0,
    projectCount: countMap.get(u.id) || 0,
  }))

  // Get today's date at midnight UTC as ISO string
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  // Get this week's start (Monday) at midnight UTC
  const dayOfWeek = today.getUTCDay()
  const weekStart = new Date(today)
  weekStart.setUTCDate(today.getUTCDate() - ((dayOfWeek + 6) % 7)) // Monday
  const weekStartISO = weekStart.toISOString()

  // Get this month's start at midnight UTC
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStartISO = monthStart.toISOString()

  // Get projects with scheduled_launch_date
  const { data: scheduledProjects, error: scheduledError } = await supabase
    .from("projects")
    .select("id, name, slug, launch_status, scheduled_launch_date, launch_type")
    .not("scheduled_launch_date", "is", null)
    .order("scheduled_launch_date", { ascending: true })

  if (scheduledError) throw scheduledError

  // Get project counts
  const { count: totalProjects } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })

  const { count: pendingProjects } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("launch_status", "draft")

  const { count: launchedProjects } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("launch_status", "launched")

  const { count: ongoingProjects } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("launch_status", "ongoing")

  const { count: scheduledProjectsCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("launch_status", "scheduled")

  // Get upvote counts
  const { count: totalUpvotes } = await supabase
    .from("upvotes")
    .select("id", { count: "exact", head: true })

  const { count: todayUpvotes } = await supabase
    .from("upvotes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayISO)

  const { count: weekUpvotes } = await supabase
    .from("upvotes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekStartISO)

  const { count: monthUpvotes } = await supabase
    .from("upvotes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStartISO)

  // Get comment counts
  const { count: totalComments } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })

  const { count: todayComments } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayISO)

  const { count: weekComments } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekStartISO)

  const { count: monthComments } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStartISO)

  // Get category counts
  const { count: totalCategories } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })

  return {
    users: {
      total: users.length,
      recent: users.slice(0, 5),
    },
    projects: {
      total: totalProjects ?? 0,
      pending: pendingProjects ?? 0,
      launched: launchedProjects ?? 0,
      ongoing: ongoingProjects ?? 0,
      scheduled: scheduledProjectsCount ?? 0,
      scheduledProjects: scheduledProjects ?? [],
    },
    upvotes: {
      total: totalUpvotes ?? 0,
      today: todayUpvotes ?? 0,
      week: weekUpvotes ?? 0,
      month: monthUpvotes ?? 0,
    },
    comments: {
      total: totalComments ?? 0,
      today: todayComments ?? 0,
      week: weekComments ?? 0,
      month: monthComments ?? 0,
    },
    categories: {
      total: totalCategories ?? 0,
    },
  }
}

export async function getAllProjectsForAdmin() {
  const supabase = getAdminClient()
  await checkAdminAccess()

  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      `
      id, name, slug, description, logo_url, website_url, launch_status, launch_type,
      daily_ranking, scheduled_launch_date, source_url, created_at, updated_at,
      categories:project_to_category(
        categories(id, name)
      )
    `,
    )
    .order("created_at", { ascending: false })

  if (error) throw error

  // Format the categories
  const formattedProjects = (projects ?? []).map((p) => ({
    ...p,
    categories: Array.isArray(p.categories)
      ? p.categories.map((pc: { categories: { id: string; name: string } }) => pc.categories)
      : [],
  }))

  return formattedProjects
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = getAdminClient()
  await checkAdminAccess()

  const { error } = await supabase.from("user").update({ role }).eq("id", userId)

  if (error) throw error

  revalidatePath("/admin")
}

export async function getAllCategoriesForAdmin() {
  const supabase = getAdminClient()
  await checkAdminAccess()

  const { data: categories, error } = await supabase.from("categories").select("*").order("name")

  if (error) throw error

  return categories ?? []
}

export async function createCategory(name: string) {
  const supabase = getAdminClient()
  await checkAdminAccess()

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  // Check if slug already exists
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .single()

  if (existing) {
    throw new Error("A category with this name already exists")
  }

  const { data, error } = await supabase.from("categories").insert({ name, slug }).select().single()

  if (error) throw error

  revalidatePath("/admin")
  return data
}

export async function updateCategory(categoryId: string, name: string) {
  const supabase = getAdminClient()
  await checkAdminAccess()

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  const { error } = await supabase.from("categories").update({ name, slug }).eq("id", categoryId)

  if (error) throw error

  revalidatePath("/admin")
}

export async function deleteCategory(categoryId: string) {
  const supabase = getAdminClient()
  await checkAdminAccess()

  // First, remove all project-category associations
  const { error: linkError } = await supabase
    .from("project_to_category")
    .delete()
    .eq("category_id", categoryId)

  if (linkError) throw linkError

  // Then delete the category itself
  const { error } = await supabase.from("categories").delete().eq("id", categoryId)

  if (error) throw error

  revalidatePath("/admin")
}

export async function deleteProject(projectId: string) {
  const supabase = getAdminClient()
  await checkAdminAccess()

  // First, remove project-category associations
  const { error: linkError } = await supabase
    .from("project_to_category")
    .delete()
    .eq("project_id", projectId)

  if (linkError) throw linkError

  // Then delete the project itself
  const { error } = await supabase.from("projects").delete().eq("id", projectId)

  if (error) throw error

  revalidatePath("/admin")
}

export async function updateProjectStatus(
  projectId: string,
  status: string,
  options?: { scheduledLaunchDate?: string },
) {
  const supabase = getAdminClient()
  await checkAdminAccess()

  const updateData: Record<string, unknown> = { launch_status: status }

  if (status === "scheduled" && options?.scheduledLaunchDate) {
    updateData.scheduled_launch_date = options.scheduledLaunchDate
  } else if (status !== "scheduled") {
    updateData.scheduled_launch_date = null
  }

  const { error } = await supabase.from("projects").update(updateData).eq("id", projectId)

  if (error) throw error

  revalidatePath("/admin")
}

export async function toggleFeatured(projectId: string, featured: boolean) {
  const supabase = getAdminClient()
  await checkAdminAccess()

  const { error } = await supabase
    .from("projects")
    .update({ is_featured: featured })
    .eq("id", projectId)

  if (error) throw error

  revalidatePath("/admin")
}

export async function createBlogArticle(data: {
  title: string
  slug: string
  description: string
  content: string
  cover_image_url?: string
  author_name?: string
  author_avatar_url?: string
}) {
  const supabase = createAdminClient()
  await checkAdminAccess()

  const { error } = await supabase.from("blog_articles").insert(data)
  if (error) throw error

  revalidatePath("/admin")
  revalidatePath("/blog")
}

export async function updateBlogArticle(
  articleId: string,
  data: {
    title?: string
    slug?: string
    description?: string
    content?: string
    cover_image_url?: string
    author_name?: string
    author_avatar_url?: string
  },
) {
  const supabase = createAdminClient()
  await checkAdminAccess()

  const { error } = await supabase.from("blog_articles").update(data).eq("id", articleId)
  if (error) throw error

  revalidatePath("/admin")
  revalidatePath("/blog")
}

export async function deleteBlogArticle(articleId: string) {
  const supabase = createAdminClient()
  await checkAdminAccess()

  const { error } = await supabase.from("blog_articles").delete().eq("id", articleId)
  if (error) throw error

  revalidatePath("/admin")
  revalidatePath("/blog")
}

export async function createReviewArticle(data: {
  title: string
  slug: string
  description: string
  content: string
  cover_image_url?: string
  author_name?: string
  author_avatar_url?: string
}) {
  const supabase = createAdminClient()
  await checkAdminAccess()

  const { error } = await supabase.from("seo_articles").insert(data)
  if (error) throw error

  revalidatePath("/admin")
  revalidatePath("/reviews")
}

export async function updateReviewArticle(
  articleId: string,
  data: {
    title?: string
    slug?: string
    description?: string
    content?: string
    cover_image_url?: string
    author_name?: string
    author_avatar_url?: string
  },
) {
  const supabase = createAdminClient()
  await checkAdminAccess()

  const { error } = await supabase.from("seo_articles").update(data).eq("id", articleId)
  if (error) throw error

  revalidatePath("/admin")
  revalidatePath("/reviews")
}

export async function deleteReviewArticle(articleId: string) {
  const supabase = createAdminClient()
  await checkAdminAccess()

  const { error } = await supabase.from("seo_articles").delete().eq("id", articleId)
  if (error) throw error

  revalidatePath("/admin")
  revalidatePath("/reviews")
}
