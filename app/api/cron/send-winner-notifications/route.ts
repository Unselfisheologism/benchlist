import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@supabase/supabase-js"
import { endOfDay, startOfDay, subDays } from "date-fns"

import { sendWinnerBadgeEmail } from "@/lib/transactional-emails"

const API_KEY = process.env.CRON_API_KEY

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const providedKey = authHeader?.replace("Bearer ", "")

    if (!API_KEY || providedKey !== API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use service role client to look up user data from auth.users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const now = new Date()
    const yesterday = subDays(startOfDay(now), 1)
    const endOfYesterday = endOfDay(yesterday)

    console.log(`[${now.toISOString()}] Starting cron: Send Winner Notifications`)
    console.log(
      `Looking for winners from: ${yesterday.toISOString()} to ${endOfYesterday.toISOString()}`,
    )

    // Find winning projects (launched, ranking 1-3, launched yesterday)
    const { data: winners } = await supabaseAdmin
      .from("projects")
      .select("id, name, slug, daily_ranking, created_by, launch_type")
      .eq("launch_status", "launched")
      .in("daily_ranking", [1, 2, 3])
      .gte("scheduled_launch_date", yesterday.toISOString())
      .lt("scheduled_launch_date", startOfDay(now).toISOString())

    if (!winners || winners.length === 0) {
      console.log("No new winners found to notify.")
      return NextResponse.json({ message: "No new winners to notify." })
    }

    console.log(`Found ${winners.length} winning projects to notify.`)
    let emailsSentCount = 0
    let emailsFailedCount = 0

    for (const winner of winners) {
      if (!winner.created_by || !winner.daily_ranking) {
        console.warn(`Skipping project ${winner.name} due to missing creator ID or ranking.`)
        continue
      }

      // Look up user via Supabase Auth Admin API
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(winner.created_by)

      if (!userData?.user?.email) {
        console.warn(
          `User not found or email missing for creator ID ${winner.created_by} of project ${winner.name}.`,
        )
        emailsFailedCount++
        continue
      }

      const projectCreator = {
        email: userData.user.email,
        name: userData.user.user_metadata?.full_name || userData.user.email,
      }

      try {
        console.log(`Sending winner email to ${projectCreator.email} for project ${winner.name}`)

        await sendWinnerBadgeEmail({
          user: { email: projectCreator.email, name: projectCreator.name },
          projectName: winner.name,
          projectSlug: winner.slug,
          ranking: winner.daily_ranking,
          launchType: winner.launch_type,
        })
        emailsSentCount++
      } catch (error) {
        emailsFailedCount++
        console.error(
          `Failed to send winner email for project ${winner.name} to ${projectCreator.email}:`,
          error,
        )
      }
    }

    console.log(`[${now.toISOString()}] Winner notification process completed.`)
    console.log(`- Emails sent successfully: ${emailsSentCount}`)
    console.log(`- Emails failed: ${emailsFailedCount}`)

    return NextResponse.json({
      message: "Winner notification process completed.",
      details: {
        winnersFound: winners.length,
        emailsSent: emailsSentCount,
        emailsFailed: emailsFailedCount,
      },
    })
  } catch (error) {
    console.error("Error in send-winner-notifications cron:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
