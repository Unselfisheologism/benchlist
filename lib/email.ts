import { ServerClient } from "postmark"

// Lazily initialized Postmark client to avoid build-time errors when API key is missing
let postmark: ServerClient | null = null

function getPostmark(): ServerClient {
  if (!postmark) {
    if (!process.env.POSTMARK_API_KEY) {
      throw new Error("POSTMARK_API_KEY environment variable is not set")
    }
    postmark = new ServerClient(process.env.POSTMARK_API_KEY)
  }
  return postmark
}

interface EmailPayload {
  to: string
  subject: string
  html: string
}

/**
 * Sends an email using Postmark
 * @param payload - Email configuration object
 * @returns Promise that resolves when email is sent
 */
export async function sendEmail(payload: EmailPayload) {
  const { to, subject, html } = payload

  try {
    const data = await getPostmark().sendEmail({
      From: "Benchlist <noreply@benchlist.dev>",
      To: to,
      Subject: subject,
      HtmlBody: html,
    })

    return { success: true, data }
  } catch (error) {
    console.error("Failed to send email:", error)
    throw new Error("Failed to send email")
  }
}
