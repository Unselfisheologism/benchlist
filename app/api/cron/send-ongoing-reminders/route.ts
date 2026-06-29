import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@supabase/supabase-js"
import { endOfDay, startOfDay } from "date-fns"

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
    const today = startOfDay(now)
    const endOfToday = endOfDay(now)

    console.log(`[${now.toISOString()}] Starting cron: Send Ongoing Launch Reminders`)

    const { data: ongoingProjects } = await supabaseAdmin
      .from("projects")
      .select("id, name, slug, created_by")
      .eq("launch_status", "ongoing")
      .gte("scheduled_launch_date", today.toISOString())
      .lt("scheduled_launch_date", endOfToday.toISOString())

    if (!ongoingProjects || ongoingProjects.length === 0) {
      console.log("No ongoing projects found to remind.")
      return NextResponse.json({ message: "No ongoing projects to remind." })
    }

    console.log(`Found ${ongoingProjects.length} ongoing projects. Email notifications removed.`)

    return NextResponse.json({
      message: "Launch reminder process completed (email disabled).",
      details: {
        projectsFound: ongoingProjects.length,
      },
    })
  } catch (error) {
    console.error("Error in send-ongoing-reminders cron:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
