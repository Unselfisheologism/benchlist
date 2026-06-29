import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@supabase/supabase-js"
import { endOfDay, startOfDay } from "date-fns"

import { sendLaunchReminderEmail } from "@/lib/transactional-emails"

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
    const today = startOfDay(now)
    const endOfToday = endOfDay(now)

    console.log(`[${now.toISOString()}] Starting cron: Send Ongoing Launch Reminders`)
    console.log(
      `Looking for projects ongoing from: ${today.toISOString()} to ${endOfToday.toISOString()}`,
    )

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

    console.log(`Found ${ongoingProjects.length} ongoing projects to remind.`)
    let emailsSentCount = 0
    let emailsFailedCount = 0

    for (const proj of ongoingProjects) {
      if (!proj.created_by) {
        console.warn(`Skipping project ${proj.name} due to missing creator ID.`)
        continue
      }

      // Look up user via Supabase Auth Admin API
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(proj.created_by)

      if (!userData?.user?.email) {
        console.warn(
          `User not found or email missing for creator ID ${proj.created_by} of project ${proj.name}.`,
        )
        emailsFailedCount++
        continue
      }

      const projectCreator = {
        email: userData.user.email,
        name: userData.user.user_metadata?.full_name || userData.user.email,
      }

      try {
        console.log(
          `Sending launch reminder email to ${projectCreator.email} for project ${proj.name}`,
        )

        await sendLaunchReminderEmail({
          user: { email: projectCreator.email, name: projectCreator.name },
          projectName: proj.name,
          projectSlug: proj.slug,
        })
        emailsSentCount++
      } catch (error) {
        emailsFailedCount++
        console.error(
          `Failed to send launch reminder email for project ${proj.name} to ${projectCreator.email}:`,
          error,
        )
      }
    }

    console.log(`[${now.toISOString()}] Launch reminder process completed.`)
    console.log(`- Emails sent successfully: ${emailsSentCount}`)
    console.log(`- Emails failed: ${emailsFailedCount}`)

    return NextResponse.json({
      message: "Launch reminder process completed.",
      details: {
        projectsFound: ongoingProjects.length,
        emailsSent: emailsSentCount,
        emailsFailed: emailsFailedCount,
      },
    })
  } catch (error) {
    console.error("Error in send-ongoing-reminders cron:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
