import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    // Vérifier l'authentification
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projectId = (await params).projectId

    // Récupérer la chaîne
    const { data: projectData } = await supabase
      .from("projects")
      .select("id, slug, launch_status, created_by")
      .eq("id", projectId)
      .limit(1)
      .single()

    if (!projectData) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Vérifier que l'utilisateur est le propriétaire de la chaîne
    if (projectData.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      id: projectData.id,
      slug: projectData.slug,
      status: projectData.launch_status,
    })
  } catch (error) {
    console.error("Error fetching project status:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
