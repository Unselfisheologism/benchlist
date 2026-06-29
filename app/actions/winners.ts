"use server"

import { createClient } from "@/lib/supabase/server"

const launchStatus = {
  PAYMENT_PENDING: "payment_pending",
  PAYMENT_FAILED: "payment_failed",
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  LAUNCHED: "launched",
} as const

// Récupérer les projets gagnants pour une date spécifique
export async function getWinnersByDate(date: Date) {
  const supabase = await createClient()

  // Créer le début et la fin de la journée
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: winners } = await supabase
    .from("projects")
    .select("id, name, slug, logo_url, description, daily_ranking, scheduled_launch_date")
    .eq("launch_status", launchStatus.LAUNCHED)
    .not("daily_ranking", "is", null)
    .gte("scheduled_launch_date", dayStart.toISOString())
    .lte("scheduled_launch_date", dayEnd.toISOString())
    .order("daily_ranking", { ascending: true })

  return winners ?? []
}

// Vérifier si une date a des gagnants
export async function dateHasWinners(date: Date) {
  const supabase = await createClient()

  // Créer le début et la fin de la journée
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("launch_status", launchStatus.LAUNCHED)
    .not("daily_ranking", "is", null)
    .gte("scheduled_launch_date", dayStart.toISOString())
    .lte("scheduled_launch_date", dayEnd.toISOString())

  return (count ?? 0) > 0
}
