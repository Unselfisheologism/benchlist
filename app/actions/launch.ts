"use server"

import { revalidatePath } from "next/cache"

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { addDays, format, isBefore, parse } from "date-fns"

import {
  DATE_FORMAT,
  LAUNCH_LIMITS,
  LAUNCH_SETTINGS,
  LAUNCH_TYPES,
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
  premiumSlots: number
  premiumPlusSlots: number
  totalSlots: number
}

// Launch status and type constants matching DB values
const LAUNCH_STATUS = {
  PAYMENT_PENDING: "payment_pending",
  PAYMENT_FAILED: "payment_failed",
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  LAUNCHED: "launched",
} as const

// Fonction pour obtenir la disponibilité des lancements pour une date spécifique
export async function getLaunchAvailability(date: string): Promise<LaunchAvailability> {
  const supabase = getAdminClient()

  // Vérifier si la date est au format correct
  const parsedDate = parse(date, DATE_FORMAT.API, new Date())
  const formattedDate = format(parsedDate, DATE_FORMAT.API)

  // Obtenir le nombre de lancements déjà programmés pour cette date
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
  let premiumCount = 0
  let premiumPlusCount = 0
  let totalCount = 0

  for (const p of scheduledLaunches ?? []) {
    const lt = p.launch_type as string
    totalCount++
    if (lt === LAUNCH_TYPES.FREE) freeCount++
    else if (lt === LAUNCH_TYPES.PREMIUM) premiumCount++
    else if (lt === LAUNCH_TYPES.PREMIUM_PLUS) premiumPlusCount++
  }

  const freeSlots = Math.max(0, LAUNCH_LIMITS.FREE_DAILY_LIMIT - freeCount)
  const premiumSlots = Math.max(0, LAUNCH_LIMITS.PREMIUM_DAILY_LIMIT - premiumCount)
  const premiumPlusSlots = Math.max(0, LAUNCH_LIMITS.PREMIUM_PLUS_DAILY_LIMIT - premiumPlusCount)
  const totalSlots = Math.max(0, LAUNCH_LIMITS.TOTAL_DAILY_LIMIT - totalCount)

  return {
    date: formattedDate,
    freeSlots,
    premiumSlots,
    premiumPlusSlots,
    totalSlots,
  }
}

// Fonction pour obtenir la disponibilité des lancements pour une plage de dates
export async function getLaunchAvailabilityRange(
  startDate: string,
  endDate: string,
  launchTypeValue: (typeof LAUNCH_TYPES)[keyof typeof LAUNCH_TYPES] = LAUNCH_TYPES.FREE,
): Promise<LaunchAvailability[]> {
  const today = new Date()
  let minDaysAhead = LAUNCH_SETTINGS.MIN_DAYS_AHEAD
  let maxDaysAhead: number = LAUNCH_SETTINGS.MAX_DAYS_AHEAD

  if (launchTypeValue === LAUNCH_TYPES.PREMIUM) {
    minDaysAhead = LAUNCH_SETTINGS.PREMIUM_MIN_DAYS_AHEAD
    maxDaysAhead = LAUNCH_SETTINGS.PREMIUM_MAX_DAYS_AHEAD
  } else if (launchTypeValue === LAUNCH_TYPES.PREMIUM_PLUS) {
    minDaysAhead = LAUNCH_SETTINGS.PREMIUM_PLUS_MIN_DAYS_AHEAD
    maxDaysAhead = LAUNCH_SETTINGS.PREMIUM_PLUS_MAX_DAYS_AHEAD
  }

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
  const availabilityResults = await Promise.all(availabilityPromises)

  return availabilityResults
}

// vérifier la limite de lancement de l'utilisateur
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
    .not("launch_status", "eq", LAUNCH_STATUS.PAYMENT_FAILED)
    .not("launch_status", "eq", LAUNCH_STATUS.PAYMENT_PENDING)

  const currentCount = rows?.length ?? 0
  const limit = USER_DAILY_LAUNCH_LIMIT
  const allowed = currentCount < limit

  return { allowed, count: currentCount, limit }
}

// Fonction pour planifier un lancement
export async function scheduleLaunch(
  projectId: string,
  date: string,
  launchTypeValue: (typeof LAUNCH_TYPES)[keyof typeof LAUNCH_TYPES],
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
        throw new Error("Date invalide après parsing")
      }
    } catch {
      parsedDate = new Date(date)

      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Format de date invalide: ${date}`)
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let minDaysAhead = LAUNCH_SETTINGS.MIN_DAYS_AHEAD
    let maxDaysAhead: number = LAUNCH_SETTINGS.MAX_DAYS_AHEAD

    if (launchTypeValue === LAUNCH_TYPES.PREMIUM) {
      minDaysAhead = LAUNCH_SETTINGS.PREMIUM_MIN_DAYS_AHEAD
      maxDaysAhead = LAUNCH_SETTINGS.PREMIUM_MAX_DAYS_AHEAD
    } else if (launchTypeValue === LAUNCH_TYPES.PREMIUM_PLUS) {
      minDaysAhead = LAUNCH_SETTINGS.PREMIUM_PLUS_MIN_DAYS_AHEAD
      maxDaysAhead = LAUNCH_SETTINGS.PREMIUM_PLUS_MAX_DAYS_AHEAD
    }

    const minDate = addDays(today, minDaysAhead)
    const maxDate = addDays(today, maxDaysAhead)

    const normalizedParsedDate = new Date(parsedDate)
    normalizedParsedDate.setHours(0, 0, 0, 0)

    if (normalizedParsedDate < minDate) {
      throw new Error(`La date de lancement doit être au moins ${minDaysAhead} jour(s) à l'avance`)
    }

    if (normalizedParsedDate > maxDate) {
      throw new Error(
        `La date de lancement ne peut pas être plus de ${maxDaysAhead} jours à l'avance pour ce type de lancement`,
      )
    }

    // Vérifier la limite de lancement de l'utilisateur AVANT de vérifier les slots globaux
    const userLaunchLimitCheck = await checkUserLaunchLimit(
      userId,
      format(parsedDate, DATE_FORMAT.API),
    )
    if (!userLaunchLimitCheck.allowed) {
      throw new Error(
        `You have reached your daily launch limit of ${userLaunchLimitCheck.limit} project(s) for this date.`,
      )
    }

    // Vérifier la disponibilité globale des slots
    const availability = await getLaunchAvailability(format(parsedDate, DATE_FORMAT.API))
    let hasAvailability = false

    if (launchTypeValue === LAUNCH_TYPES.FREE) {
      hasAvailability = availability.freeSlots > 0
    } else if (launchTypeValue === LAUNCH_TYPES.PREMIUM) {
      hasAvailability = availability.premiumSlots > 0
    } else if (launchTypeValue === LAUNCH_TYPES.PREMIUM_PLUS) {
      hasAvailability = availability.premiumPlusSlots > 0
    }

    if (!hasAvailability) {
      throw new Error("No availability for the selected date and launch type")
    }

    // CORRECTION: Créer une date UTC correcte pour le jour sélectionné à 8h UTC
    const year = parsedDate.getFullYear()
    const month = parsedDate.getMonth()
    const day = parsedDate.getDate()

    const launchDate = new Date(
      Date.UTC(year, month, day, LAUNCH_SETTINGS.LAUNCH_HOUR_UTC, 0, 0, 0),
    )

    // Déterminer le statut initial en fonction du type de lancement
    let initialStatus: string = LAUNCH_STATUS.SCHEDULED

    if (launchTypeValue === LAUNCH_TYPES.PREMIUM || launchTypeValue === LAUNCH_TYPES.PREMIUM_PLUS) {
      initialStatus = LAUNCH_STATUS.PAYMENT_PENDING
    }

    // Mettre à jour le projet avec la date de lancement et le type
    const { error: updateError } = await supabase
      .from("project")
      .update({
        scheduled_launch_date: launchDate.toISOString(),
        launch_type: launchTypeValue,
        launch_status: initialStatus,
        featured_on_homepage: launchTypeValue === LAUNCH_TYPES.PREMIUM_PLUS,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId)

    if (updateError) {
      throw new Error("Failed to update project schedule")
    }

    // Ne mettre à jour les quotas que pour les lancements gratuits
    if (launchTypeValue === LAUNCH_TYPES.FREE) {
      // Mettre à jour ou créer le quota pour cette date
      const { data: quotaResult } = await supabase
        .from("launch_quota")
        .select("id, free_count")
        .eq("date", launchDate.toISOString())
        .limit(1)

      if (!quotaResult || quotaResult.length === 0) {
        // Créer un nouveau quota
        await supabase.from("launch_quota").insert({
          id: crypto.randomUUID(),
          date: launchDate.toISOString(),
          free_count: 1,
          premium_count: 0,
          premium_plus_count: 0,
        })
      } else {
        // Mettre à jour le quota existant
        await supabase
          .from("launch_quota")
          .update({
            free_count: (quotaResult[0].free_count ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", quotaResult[0].id)
      }
    }

    // Revalider les chemins
    revalidatePath("/")
    revalidatePath("/dashboard")
    revalidatePath(`/projects/${projectId}`)

    return true
  } catch (error) {
    console.error("Error scheduling launch:", error)
    throw error
  }
}

// Mettre à jour le statut des chaînes dont la date de lancement est aujourd'hui
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

// Mettre à jour le statut des chaînes dont la date de lancement était hier
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
