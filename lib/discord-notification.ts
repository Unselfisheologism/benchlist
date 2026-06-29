/**
 * Utility for sending notifications to Discord via webhook
 */

import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js"

// Lazily initialized to avoid build-time errors when env vars are missing
let supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables are not set")
    }
    supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )
  }
  return supabaseAdmin
}

interface DiscordEmbed {
  title: string
  color: number
  description: string
  url?: string
  fields: {
    name: string
    value: string
    inline: boolean
  }[]
  footer: {
    text: string
  }
  timestamp: string
}

interface DiscordMessage {
  embeds: DiscordEmbed[]
}

const launchType = {
  FREE: "free",
  PREMIUM: "premium",
  PREMIUM_PLUS: "premium_plus",
} as const

/**
 * Send a Discord notification for a new comment
 */
export async function sendDiscordCommentNotification(
  projectId: string,
  userId: string,
  commentText: string,
): Promise<boolean> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) {
      console.error("DISCORD_WEBHOOK_URL is not defined")
      return false
    }

    let userInfo = { email: userId, name: "Unknown User" }
    try {
      const { data: authUser } = await getSupabaseAdmin().auth.admin.getUserById(userId)
      if (authUser?.user) {
        userInfo = {
          email: authUser.user.email || userId,
          name:
            (authUser.user.user_metadata as Record<string, string>)?.full_name ||
            authUser.user.email ||
            "Unknown User",
        }
      }
    } catch (error) {
      console.error("Error retrieving user info:", error)
    }

    let projectInfo = { slug: projectId, name: "Unknown Project" }
    try {
      const { data: project } = await getSupabaseAdmin()
        .from("projects")
        .select("slug, name")
        .eq("id", projectId)
        .single()
      if (project) projectInfo = project
    } catch (error) {
      console.error("Error retrieving project info:", error)
    }

    const projectUrl = `${process.env.NEXT_PUBLIC_URL || ""}/projects/${projectInfo.slug}`
    const truncatedText =
      commentText.length > 1500 ? commentText.substring(0, 1500) + "..." : commentText

    const message: DiscordMessage = {
      embeds: [
        {
          title: "New Comment",
          color: 0x00ff00,
          description: truncatedText,
          url: projectUrl,
          fields: [
            { name: "Project", value: `[${projectInfo.name}](${projectUrl})`, inline: true },
            { name: "User", value: `${userInfo.name} (${userInfo.email})`, inline: true },
          ],
          footer: { text: "Benchlist Comment Notification" },
          timestamp: new Date().toISOString(),
        },
      ],
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })

    return response.ok
  } catch (error) {
    console.error("Error sending Discord notification:", error)
    return false
  }
}

/**
 * Send a Discord notification for a scheduled launch
 */
export async function notifyDiscordLaunch(
  projectName: string,
  launchDate: string,
  launchTypeValue: string,
  websiteUrl: string,
  projectUrl: string,
  userId?: string,
): Promise<boolean> {
  try {
    const webhookUrl = process.env.DISCORD_LAUNCH_WEBHOOK_URL
    if (!webhookUrl) {
      console.error("Discord webhook URL is not defined")
      return false
    }

    const formattedLaunchType = launchTypeValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")

    let color = 0x00ff00
    if (launchTypeValue === launchType.PREMIUM) color = 0xff9900
    else if (launchTypeValue === launchType.PREMIUM_PLUS) color = 0xff0000

    const submittedByFieldValue = await (async () => {
      if (!userId) return "N/A (User ID not provided)"
      try {
        const { data: authUser } = await getSupabaseAdmin().auth.admin.getUserById(userId)
        if (authUser?.user) {
          const name = (authUser.user.user_metadata as Record<string, string>)?.full_name
          const email = authUser.user.email
          if (name && email) return `${name} (${email})`
        }
        return `User ID: ${userId} (Info not fully available)`
      } catch {
        return `User ID: ${userId} (Error fetching info)`
      }
    })()

    const message = {
      embeds: [
        {
          title: "New Project Launch Scheduled",
          color,
          url: projectUrl,
          description: `New project submitted: ${projectName}`,
          fields: [
            { name: "Project URL", value: `[Visit Project](${projectUrl})`, inline: true },
            { name: "Launch Date", value: launchDate, inline: true },
            { name: "Launch Type", value: formattedLaunchType, inline: true },
            { name: "Website URL", value: `[Visit Website](${websiteUrl})`, inline: true },
            { name: "Submitted By", value: submittedByFieldValue, inline: true },
          ],
          footer: { text: "Benchlist Launch Notification" },
          timestamp: new Date().toISOString(),
        },
      ],
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })

    return response.ok
  } catch (error) {
    console.error("Error sending Discord notification:", error)
    return false
  }
}
