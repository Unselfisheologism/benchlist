import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@supabase/supabase-js"
import { endOfDay, startOfDay, subDays } from "date-fns"

const API_KEY = process.env.CRON_API_KEY

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const providedKey = authHeader?.replace("Bearer ", "")

    if (!API_KEY || providedKey !== API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    console.log(`Found ${winners.length} winning projects. Email notifications removed.`)

    return NextResponse.json({
      message: "Winner notification process completed (email disabled).",
      details: {
        winnersFound: winners.length,
      },
    })
  } catch (error) {
    console.error("Error in send-winner-notifications cron:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
