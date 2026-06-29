"use server"

import { createClient } from "@/lib/supabase/server"

export async function banUser(userId: string) {
  const supabase = await createClient()
  // Ban user by updating metadata and banning via admin API
  const thirtyDays = new Date()
  thirtyDays.setDate(thirtyDays.getDate() + 30)

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: "10080h", // 30 days in hours (30*24)
  })
  if (error) throw error
  return { success: true }
}

export async function unbanUser(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: "0",
  })
  if (error) throw error
  return { success: true }
}

export async function deleteUser(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw error
  return { success: true }
}
