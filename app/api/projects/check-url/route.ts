import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
    }

    // Normaliser l'URL pour la comparaison
    const normalizedUrl = url.toLowerCase().replace(/\/$/, "")

    const supabase = await createClient()

    // Vérifier si l'URL existe déjà
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id, launch_status")
      .eq("website_url", normalizedUrl)
      .limit(1)
      .single()

    // If no project found, the URL is available
    if (!existingProject) {
      return NextResponse.json({ exists: false })
    }

    // In all other cases, the URL is considered taken
    return NextResponse.json({ exists: true })
  } catch (error) {
    console.error("Error checking URL:", error)
    return NextResponse.json({ error: "Failed to check URL" }, { status: 500 })
  }
}
