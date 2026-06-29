"use server"

import { revalidatePath } from "next/cache"

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { addDays, format, isBefore, parse } from "date-fns"

import {
  DATE_FORMAT,
  LAUNCH_LIMITS,
  LAUNCH_SETTINGS,
  USER_DAILY_LAUNCH_LIMIT,
} from "@/lib/constants"

const getAdminClient = () =>
  createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

export interface LaunchAvailability {
  date: string
  freeSlots: number
  totalSlots: number
}

// Launch status constants matching DB values
const LAUNCH_STATUS = {
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  LAUNCHED: "launched",
} as const

// Get launch availability for a specific date
export async function getLaunchAvailability(date: string): Promise<LaunchAvailability> {
  const supabase = getAdminClient()

  const parsedDate = parse(date, DATE_FORMAT.API, new Date())
  const formattedDate = format(parsedDate, DATE_FORMAT.API)

  const startOfDay = new Date(parsedDate)
  startOfDay.setUTCHours(0, 0, 0, 0)
  const endOfDay = addDays(startOfDay, 1)

  const { data: scheduledLaunches } = await supabase
    .from("project")
    .select("launch_type, id")
    .gte("scheduled_launch_date", startOfDay.toISOString())
    .lt("scheduled_launch_date", endOfDay.toISOString())
    .eq("launch_status", LAUNCH_STATUS.SCHEDULED)

  let freeCount = 0
  let totalCount = 0

  for (const p of scheduledLaunches ?? []) {
    const lt = p.launch_type as string
    totalCount++
    if (lt === "free") freeCount++
  }

  const freeSlots = Math.max(0, LAUNCH_LIMITS.FREE_DAILY_LIMIT - freeCount)
  const totalSlots = Math.max(0, LAUNCH_LIMITS.TOTAL_DAILY_LIMIT - totalCount)

  return {
    date: formattedDate,
    freeSlots,
    totalSlots,
  }
}

// Get launch availability for a date range
export async function getLaunchAvailabilityRange(
  startDate: string,
  endDate: string,
): Promise<LaunchAvailability[]> {
  const today = new Date()
  const minDaysAhead = LAUNCH_SETTINGS.MIN_DAYS_AHEAD
  const maxDaysAhead: number = LAUNCH_SETTINGS.MAX_DAYS_AHEAD

  const minDate = addDays(today, minDaysAhead)
  const maxDate = addDays(today, maxDaysAhead)

  const parsedStartDate = parse(startDate, DATE_FORMAT.API, new Date())
  const parsedEndDate = parse(endDate, DATE_FORMAT.API, new Date())

  const adjustedStartDate = isBefore(parsedStartDate, minDate) ? minDate : parsedStartDate
  const adjustedEndDate = isBefore(maxDate, parsedEndDate) ? maxDate : parsedEndDate

  const dates: Date[] = []
  let currentDate = new Date(adjustedStartDate)
  while (currentDate <= adjustedEndDate) {
    dates.push(new Date(currentDate))
    currentDate = addDays(currentDate, 1)
  }

  const availabilityPromises = dates.map((date) =>
    getLaunchAvailability(format(date, DATE_FORMAT.API)),
  )
  return Promise.all(availabilityPromises)
}

// Check user daily launch limit
export async function checkUserLaunchLimit(
  userId: string,
  launchDate: string,
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const supabase = getAdminClient()
  const [year, month, day] = launchDate.split("-").map(Number)
  const dateStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  const nextDayStart = new Date(dateStart)
  nextDayStart.setUTCDate(dateStart.getUTCDate() + 1)

  const { data: rows } = await supabase
    .from("project")
    .select("id")
    .eq("created_by", userId)
    .gte("scheduled_launch_date", dateStart.toISOString())
    .lt("scheduled_launch_date", nextDayStart.toISOString())

  const currentCount = rows?.length ?? 0
  const limit = USER_DAILY_LAUNCH_LIMIT
  const allowed = currentCount < limit

  return { allowed, count: currentCount, limit }
}

// Schedule a launch
export async function scheduleLaunch(
  projectId: string,
  date: string,
  userId: string | undefined,
): Promise<boolean> {
  const supabase = getAdminClient()

  if (!userId) {
    throw new Error("User ID is required to schedule a launch.")
  }

  try {
    let parsedDate: Date

    try {
      parsedDate = parse(date, DATE_FORMAT.API, new Date())
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date after parsing")
      }
    } catch {
      parsedDate = new Date(date)
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date format: ${date}`)
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const minDaysAhead = LAUNCH_SETTINGS.MIN_DAYS_AHEAD
    const maxDaysAhead: number = LAUNCH_SETTINGS.MAX_DAYS_AHEAD

    const minDate = addDays(today, minDaysAhead)
    const maxDate = addDays(today, maxDaysAhead)

    const normalizedParsedDate = new Date(parsedDate)
    normalizedParsedDate.setHours(0, 0, 0, 0)

    if (normalizedParsedDate < minDate) {
      throw new Error(`Launch date must be at least ${minDaysAhead} day(s) ahead`)
    }

    if (normalizedParsedDate > maxDate) {
      throw new Error(`Launch date cannot be more than ${maxDaysAhead} days ahead`)
    }

    // Check user daily limit
    const userLaunchLimitCheck = await checkUserLaunchLimit(
      userId,
      format(parsedDate, DATE_FORMAT.API),
    )
    if (!userLaunchLimitCheck.allowed) {
      throw new Error(
        `You have reached your daily launch limit of ${userLaunchLimitCheck.limit} project(s) for this date.`,
      )
    }

    // Check global availability
    const availability = await getLaunchAvailability(format(parsedDate, DATE_FORMAT.API))
    if (availability.freeSlots <= 0) {
      throw new Error("No availability for the selected date")
    }

    // Create UTC date for the selected day at launch hour
    const year = parsedDate.getFullYear()
    const month = parsedDate.getMonth()
    const day = parsedDate.getDate()

    const launchDate = new Date(
      Date.UTC(year, month, day, LAUNCH_SETTINGS.LAUNCH_HOUR_UTC, 0, 0, 0),
    )

    // Update project
    const { error: updateError } = await supabase
      .from("project")
      .update({
        scheduled_launch_date: launchDate.toISOString(),
        launch_type: "free",
        launch_status: LAUNCH_STATUS.SCHEDULED,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)

    if (updateError) {
      throw new Error("Failed to update project schedule")
    }

    // Update launch quota for free launches
    const { data: quotaResult } = await supabase
      .from("launch_quota")
      .select("id, free_count")
      .eq("date", launchDate.toISOString())
      .limit(1)

    if (!quotaResult || quotaResult.length === 0) {
      await supabase.from("launch_quota").insert({
        id: crypto.randomUUID(),
        date: launchDate.toISOString(),
        free_count: 1,
      })
    } else {
      await supabase
        .from("launch_quota")
        .update({
          free_count: (quotaResult[0].free_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quotaResult[0].id)
    }

    // Revalidate paths
    revalidatePath("/")
    revalidatePath("/dashboard")
    revalidatePath(`/projects/${projectId}`)

    return true
  } catch (error) {
    console.error("Error scheduling launch:", error)
    throw error
  }
}

// Update projects with today's launch date to ONGOING
export async function updateProjectStatusToOngoing() {
  const supabase = getAdminClient()
  const todayStart = new Date()
  todayStart.setUTCHours(LAUNCH_SETTINGS.LAUNCH_HOUR_UTC, 0, 0, 0)

  const { error, count } = await supabase
    .from("project")
    .update({
      launch_status: LAUNCH_STATUS.ONGOING,
      updated_at: new Date().toISOString(),
    })
    .eq("launch_status", LAUNCH_STATUS.SCHEDULED)
    .gte("scheduled_launch_date", todayStart.toISOString())
    .lt("scheduled_launch_date", addDays(todayStart, 1).toISOString())

  if (error) throw error
  console.log(`Updated ${count} projects to ONGOING`)
  return { success: true, updatedCount: count ?? 0 }
}

// Update projects launched yesterday to LAUNCHED
export async function updateProjectStatusToLaunched() {
  const supabase = getAdminClient()
  const today = new Date()
  const yesterdayStart = new Date(today)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  yesterdayStart.setUTCHours(LAUNCH_SETTINGS.LAUNCH_HOUR_UTC, 0, 0, 0)

  const { error, count } = await supabase
    .from("project")
    .update({
      launch_status: LAUNCH_STATUS.LAUNCHED,
      updated_at: new Date().toISOString(),
    })
    .eq("launch_status", LAUNCH_STATUS.ONGOING)
    .gte("scheduled_launch_date", yesterdayStart.toISOString())
    .lt("scheduled_launch_date", addDays(yesterdayStart, 1).toISOString())

  if (error) throw error
  console.log(`Updated ${count} projects to LAUNCHED`)
  return { success: true, updatedCount: count ?? 0 }
}
