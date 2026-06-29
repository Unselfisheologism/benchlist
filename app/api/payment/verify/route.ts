import { NextResponse } from "next/server"

import Stripe from "stripe"

import { createClient } from "@/lib/supabase/server"

// Lazily initialized to avoid build-time errors when env vars are missing
let stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set")
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return stripe
}

export async function GET(request: Request) {
  try {
    // Récupérer l'ID de session des paramètres de requête
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Récupérer les détails de la session depuis Stripe
    const session = await getStripe().checkout.sessions.retrieve(sessionId)

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Récupérer l'ID du projet depuis la session
    const projectId = session.client_reference_id

    if (!projectId) {
      return NextResponse.json({ error: "No project ID found in session" }, { status: 400 })
    }

    // Vérifier le statut du paiement
    if (session.payment_status === "paid") {
      const supabase = await createClient()

      // Récupérer les informations du projet
      const { data: projectData } = await supabase
        .from("projects")
        .select("id, slug, launch_status")
        .eq("id", projectId)
        .limit(1)
        .single()

      if (!projectData) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 })
      }

      return NextResponse.json({
        status: "complete",
        projectId: projectData.id,
        projectSlug: projectData.slug,
        launchStatus: projectData.launch_status,
      })
    } else if (session.payment_status === "unpaid") {
      return NextResponse.json({ status: "pending" })
    } else {
      return NextResponse.json({ status: "failed" })
    }
  } catch (error) {
    console.error("Error verifying payment:", error)
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 })
  }
}
