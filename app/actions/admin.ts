"use server"

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { addDays, format } from "date-fns"

import { DATE_FORMAT, LAUNCH_SETTINGS } from "@/lib/constants"
import { createClient } from "@/lib/supabase/server"

import { getLaunchAvailabilityRange } from "./launch"

const getAdminClient = () =>
  createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

// Vérification des droits admin
async function checkAdminAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== "admin") {
    throw new Error("Unauthorized: Admin access required")
  }
}

// Get all users and launch stats
export async function getAdminStatsAndUsers() {
  const supabase = await getAdminClient()
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

  // Get new users today
  const { count: newUsersToday } = await supabase
    .from("user")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayISO)

  // Get launch stats — total launches
  const { count: totalLaunches } = await supabase
    .from("project")
    .select("*", { count: "exact", head: true })

  // New launches today
  const { count: newLaunchesToday } = await supabase
    .from("project")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayISO)

  return {
    users,
    stats: {
      totalLaunches: Number(totalLaunches || 0),
      totalUsers: users.length,
      newUsersToday: Number(newUsersToday || 0),
      newLaunchesToday: Number(newLaunchesToday || 0),
    },
  }
}

// Get free launch availability
export async function getFreeLaunchAvailability() {
  await checkAdminAccess()

  const today = new Date()
  const startDate = format(addDays(today, LAUNCH_SETTINGS.MIN_DAYS_AHEAD), DATE_FORMAT.API)
  const endDate = format(addDays(today, LAUNCH_SETTINGS.MAX_DAYS_AHEAD), DATE_FORMAT.API)

  const availability = await getLaunchAvailabilityRange(startDate, endDate)

  // Find the first available date
  const firstAvailableDate = availability.find((date) => date.freeSlots > 0)

  return {
    availability,
    firstAvailableDate: firstAvailableDate
      ? {
          date: firstAvailableDate.date,
          freeSlots: firstAvailableDate.freeSlots,
        }
      : null,
  }
}

// Get all categories
export async function getCategories() {
  const supabase = await getAdminClient()
  await checkAdminAccess()

  const { data: categories, error: catError } = await supabase
    .from("category")
    .select("name")
    .order("name", { ascending: true })

  if (catError) throw catError

  const { count: totalCount } = await supabase
    .from("category")
    .select("*", { count: "exact", head: true })

  return {
    categories: categories ?? [],
    totalCount: totalCount ?? 0,
  }
}

// Add a new category
export async function addCategory(name: string) {
  const supabase = await getAdminClient()
  await checkAdminAccess()

  // Name validation
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { success: false, error: "Category name cannot be empty" }
  }
  if (trimmedName.length < 2) {
    return { success: false, error: "Category name must be at least 2 characters long" }
  }
  if (trimmedName.length > 50) {
    return { success: false, error: "Category name cannot exceed 50 characters" }
  }

  try {
    const id = trimmedName.toLowerCase().replace(/\s+/g, "-")

    // Check if category already exists
    const { data: existing, error: existError } = await supabase
      .from("category")
      .select("id")
      .eq("name", trimmedName)
      .limit(1)

    if (existError) throw existError

    if (existing && existing.length > 0) {
      return { success: false, error: "This category already exists" }
    }

    const { error: insertError } = await supabase.from("category").insert({ id, name: trimmedName })

    if (insertError) {
      if (insertError.message.includes("unique") || insertError.code === "23505") {
        return { success: false, error: "This category already exists" }
      }
      throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error("Error adding category:", error)
    if (error instanceof Error && error.message.includes("unique constraint")) {
      return { success: false, error: "This category already exists" }
    }
    return { success: false, error: "An error occurred while adding the category" }
  }
}

// Ban user
export async function banUser(userId: string) {
  const supabase = await getAdminClient()
  await checkAdminAccess()
  const { error } = await supabase.from("user").update({ banned: true }).eq("id", userId)
  if (error) throw error
}

// Unban user
export async function unbanUser(userId: string) {
  const supabase = await getAdminClient()
  await checkAdminAccess()
  const { error } = await supabase
    .from("user")
    .update({ banned: false, ban_reason: null, ban_expires: null })
    .eq("id", userId)
  if (error) throw error
}

// Delete user
export async function deleteUser(userId: string) {
  const supabase = await getAdminClient()
  await checkAdminAccess()
  const { error } = await supabase.from("user").delete().eq("id", userId)
  if (error) throw error
}

// Update user role
export async function updateUserRole(userId: string, role: string) {
  const supabase = await getAdminClient()
  await checkAdminAccess()
  const { error } = await supabase.from("user").update({ role }).eq("id", userId)
  if (error) throw error
}
