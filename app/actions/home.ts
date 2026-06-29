"use server"

import { endOfMonth, startOfMonth } from "date-fns"

import { PROJECT_LIMITS_VARIABLES } from "@/lib/constants"
import { createClient } from "@/lib/supabase/server"

const launchStatus = {
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  LAUNCHED: "launched",
} as const

async function getCurrentUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Maps a project row from Supabase (snake_case) to camelCase for UI consumption
type TodayProject = {
  id: string
  slug: string
  name: string
  logo_url: string
  website_url?: string | null
  launch_status: string
  launch_type?: string | null
  daily_ranking?: number | null
  scheduled_launch_date?: string | null
  created_at: string
  description?: string | null
}

function mapProject<
  T extends {
    id: string
    slug: string
    name: string
    logo_url: string
    website_url?: string | null
    launch_status: string
    launch_type?: string | null
    daily_ranking?: number | null
    scheduled_launch_date?: string | null
    created_at: string
    description?: string | null
  },
>(p: T) {
  return {
    ...p,
    logoUrl: p.logo_url,
    websiteUrl: p.website_url,
    launchStatus: p.launch_status,
    launchType: p.launch_type,
    dailyRanking: p.daily_ranking,
    scheduledLaunchDate: p.scheduled_launch_date,
    createdAt: p.created_at,
  } as T & {
    logoUrl: string
    websiteUrl?: string | null
    launchStatus: string
    launchType?: string | null
    dailyRanking?: number | null
    scheduledLaunchDate?: string | null
    createdAt: string
  }
}

async function enrichProjectsWithUserData<T extends { id: string }>(
  projects: T[],
  userId: string | null,
) {
  if (!projects.length)
    return projects as (T & {
      userHasUpvoted: boolean
      categories: { id: string; name: string }[]
    })[]

  const projectIds = projects.map((p) => p.id)
  const supabase = await createClient()

  const { data: projectCategories } = await supabase
    .from("project_to_category")
    .select("project_id, category_id, categories(id, name)")
    .in("project_id", projectIds)

  const categoriesByProjectId: Record<string, { id: string; name: string }[]> = {}
  for (const row of projectCategories || []) {
    if (!categoriesByProjectId[row.project_id]) {
      categoriesByProjectId[row.project_id] = []
    }
    const cats = row.categories as
      { id: string; name: string } | { id: string; name: string }[] | null
    if (cats) {
      if (Array.isArray(cats)) {
        categoriesByProjectId[row.project_id].push(...cats)
      } else {
        categoriesByProjectId[row.project_id].push(cats)
      }
    }
  }

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

export async function getTodayProjects(limit: number = PROJECT_LIMITS_VARIABLES.TODAY_LIMIT) {
  const userId = await getCurrentUserId()
  const supabase = await createClient()

  const { data: todayProjects } = await supabase
    .from("projects")
    .select(
      "id, name, slug, description, logo_url, website_url, launch_status, launch_type, daily_ranking, scheduled_launch_date, created_at",
    )
    .eq("launch_status", launchStatus.ONGOING)
    .order("created_at", { ascending: false })
  const projects_today = (todayProjects ?? []) as unknown as TodayProject[]

  if (!todayProjects) return []

  const projectIds = projects_today.map((p) => p.id)
  const { data: upvotes } = await supabase
    .from("upvotes")
    .select("project_id")
    .in("project_id", projectIds)

  const upvoteCounts: Record<string, number> = {}
  for (const uv of upvotes || []) {
    upvoteCounts[uv.project_id] = (upvoteCounts[uv.project_id] || 0) + 1
  }

  const sortedProjects = projects_today
    .map((p) => {
      const x = { ...p, upvoteCount: upvoteCounts[p.id] || 0 } as TodayProject & {
        upvoteCount: number
      }
      return mapProject(x)
    })
    .sort((a, b) => b.upvoteCount - a.upvoteCount)
    .slice(0, limit)

  return enrichProjectsWithUserData(sortedProjects, userId)
}

export async function getYesterdayProjects(
  limit: number = PROJECT_LIMITS_VARIABLES.YESTERDAY_LIMIT,
) {
  const userId = await getCurrentUserId()
  const now = new Date()
  const isBeforeLaunchTime = now.getUTCHours() < 8
  const yesterdayStart = new Date(now)
  yesterdayStart.setUTCHours(8, 0, 0, 0)
  if (isBeforeLaunchTime) {
    yesterdayStart.setDate(yesterdayStart.getDate() - 2)
  } else {
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  }
  const yesterdayEnd = new Date(yesterdayStart)
  yesterdayEnd.setDate(yesterdayEnd.getDate() + 1)

  const supabase = await createClient()

  const { data: yesterdayProjects } = await supabase
    .from("projects")
    .select(
      "id, name, slug, description, logo_url, website_url, launch_status, launch_type, daily_ranking, scheduled_launch_date, created_at",
    )
    .eq("launch_status", launchStatus.LAUNCHED)
    .gte("scheduled_launch_date", yesterdayStart.toISOString())
    .lt("scheduled_launch_date", yesterdayEnd.toISOString())

  if (!yesterdayProjects) return []
  const pj_yesterday = (yesterdayProjects ?? []) as unknown as TodayProject[]
  const projectIds = pj_yesterday.map((p) => p.id)
  const { data: upvotes } = await supabase
    .from("upvotes")
    .select("project_id")
    .in("project_id", projectIds)

  const upvoteCounts: Record<string, number> = {}
  for (const uv of upvotes || []) {
    upvoteCounts[uv.project_id] = (upvoteCounts[uv.project_id] || 0) + 1
  }

  const sortedProjects = pj_yesterday
    .map((p) => mapProject({ ...p, upvoteCount: upvoteCounts[p.id] || 0 }))
    .sort((a, b) => b.upvoteCount - a.upvoteCount)
    .slice(0, limit)

  return enrichProjectsWithUserData(sortedProjects, userId)
}

export async function getMonthBestProjects(limit: number = PROJECT_LIMITS_VARIABLES.MONTH_LIMIT) {
  const userId = await getCurrentUserId()
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const supabase = await createClient()

  const { data: monthProjects } = await supabase
    .from("projects")
    .select(
      "id, name, slug, description, logo_url, website_url, launch_status, launch_type, daily_ranking, scheduled_launch_date, created_at",
    )
    .eq("launch_status", launchStatus.LAUNCHED)
    .gte("scheduled_launch_date", monthStart.toISOString())
    .lte("scheduled_launch_date", monthEnd.toISOString())

  if (!monthProjects) return []
  const pj_month = (monthProjects ?? []) as unknown as TodayProject[]
  const projectIds = pj_month.map((p) => p.id)
  const { data: upvotes } = await supabase
    .from("upvotes")
    .select("project_id")
    .in("project_id", projectIds)

  const upvoteCounts: Record<string, number> = {}
  for (const uv of upvotes || []) {
    upvoteCounts[uv.project_id] = (upvoteCounts[uv.project_id] || 0) + 1
  }

  const sortedProjects = pj_month
    .map((p) => mapProject({ ...p, upvoteCount: upvoteCounts[p.id] || 0 }))
    .sort((a, b) => b.upvoteCount - a.upvoteCount)
    .slice(0, limit)

  return enrichProjectsWithUserData(sortedProjects, userId)
}

export async function getYesterdayTopProjects() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setHours(23, 59, 59, 999)

  const supabase = await createClient()

  const { data: topProjects } = await supabase
    .from("projects")
    .select("id, name, slug, logo_url, daily_ranking")
    .eq("launch_status", launchStatus.LAUNCHED)
    .not("daily_ranking", "is", null)
    .gte("scheduled_launch_date", yesterday.toISOString())
    .lte("scheduled_launch_date", yesterdayEnd.toISOString())
    .order("daily_ranking", { ascending: true })
    .limit(3)

  return ((topProjects as TodayProject[]) || []).map((p) => mapProject(p))
}

export async function getWinnersByDate(date: Date) {
  const userId = await getCurrentUserId()
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const supabase = await createClient()

  const { data: winnersBase } = await supabase
    .from("projects")
    .select(
      "id, name, slug, description, logo_url, website_url, daily_ranking, launch_status, scheduled_launch_date, created_at",
    )
    .eq("launch_status", launchStatus.LAUNCHED)
    .not("daily_ranking", "is", null)
    .lte("daily_ranking", 3)
    .gte("scheduled_launch_date", dayStart.toISOString())
    .lte("scheduled_launch_date", dayEnd.toISOString())
    .order("daily_ranking", { ascending: true })

  if (!winnersBase) return []
  const pj_winners = (winnersBase ?? []) as unknown as TodayProject[]
  const projectIds = pj_winners.map((p) => p.id)
  const { data: upvotes } = await supabase
    .from("upvotes")
    .select("project_id")
    .in("project_id", projectIds)

  const upvoteCounts: Record<string, number> = {}
  for (const uv of upvotes || []) {
    upvoteCounts[uv.project_id] = (upvoteCounts[uv.project_id] || 0) + 1
  }

  const winnersWithCounts = pj_winners.map((p) =>
    mapProject({ ...p, upvoteCount: upvoteCounts[p.id] || 0 }),
  )

  return enrichProjectsWithUserData(winnersWithCounts, userId)
}
