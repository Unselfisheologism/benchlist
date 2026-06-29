import { revalidatePath } from "next/cache"
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

// Constantes pour les statuts de lancement
const launchStatus = {
  PAYMENT_PENDING: "payment_pending",
  PAYMENT_FAILED: "payment_failed",
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  LAUNCHED: "launched",
} as const

const launchType = {
  FREE: "free",
  PREMIUM: "premium",
  PREMIUM_PLUS: "premium_plus",
} as const

// Initialiser le client Stripe
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature") as string

    // Vérifier la signature du webhook
    let event: Stripe.Event
    try {
      event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
    }

    // Traiter l'événement
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      // Find the project using client_reference_id (which we set as projectId)
      const projectId = session.client_reference_id
      if (!projectId) {
        console.error("No project ID found in session metadata")
        return NextResponse.json(
          { error: "No project ID found in session metadata" },
          { status: 400 },
        )
      }

      // Vérifier si le paiement a réussi
      if (session.payment_status === "paid") {
        const supabase = await createClient()

        // Récupérer les informations de la chaîne
        const { data: projectData } = await supabase
          .from("projects")
          .select("id, launch_type, scheduled_launch_date")
          .eq("id", projectId)
          .limit(1)
          .single()

        if (!projectData) {
          console.error("Project not found:", projectId)
          return NextResponse.json({ error: "Project not found" }, { status: 404 })
        }

        if (!projectData.scheduled_launch_date) {
          console.error("Project data incomplete:", projectId)
          return NextResponse.json({ error: "Project data incomplete" }, { status: 400 })
        }

        // Update the project status to 'scheduled'
        await supabase
          .from("projects")
          .update({
            launch_status: launchStatus.SCHEDULED,
            // Pour Premium Plus, activer la mise en avant sur la page d'accueil
            featured_on_homepage: projectData.launch_type === launchType.PREMIUM_PLUS,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId)

        // Mettre à jour le quota pour cette date
        const launchDate = projectData.scheduled_launch_date

        const { data: quotaResult } = await supabase
          .from("launch_quota")
          .select("*")
          .eq("date", launchDate)
          .limit(1)

        if (!quotaResult || quotaResult.length === 0) {
          // Créer un nouveau quota
          await supabase.from("launch_quota").insert({
            id: crypto.randomUUID(),
            date: launchDate,
            free_count: 0,
            premium_count: projectData.launch_type === launchType.PREMIUM ? 1 : 0,
            premium_plus_count: projectData.launch_type === launchType.PREMIUM_PLUS ? 1 : 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        } else {
          // Mettre à jour le quota existant
          const existingQuota = quotaResult[0]
          await supabase
            .from("launch_quota")
            .update({
              premium_count:
                projectData.launch_type === launchType.PREMIUM
                  ? existingQuota.premium_count + 1
                  : existingQuota.premium_count,
              premium_plus_count:
                projectData.launch_type === launchType.PREMIUM_PLUS
                  ? existingQuota.premium_plus_count + 1
                  : existingQuota.premium_plus_count,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingQuota.id)
        }

        // Revalidate the project page path using the project ID
        try {
          revalidatePath(`/projects`) // Revalidation plus large pour l'instant
          console.log(`Revalidated path for project: ${projectId}`)
        } catch (revalidateError) {
          console.error("Error revalidating path:", revalidateError)
        }

        return NextResponse.json({ success: true })
      } else {
        // Si le paiement n'a pas réussi, mettre à jour le statut à PAYMENT_FAILED
        const supabase = await createClient()
        await supabase
          .from("projects")
          .update({
            launch_status: launchStatus.PAYMENT_FAILED,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId)

        return NextResponse.json({ success: true })
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session
      const projectId = session.client_reference_id

      if (projectId) {
        const supabase = await createClient()
        // Mettre à jour le statut de la chaîne à PAYMENT_FAILED
        await supabase
          .from("projects")
          .update({
            launch_status: launchStatus.PAYMENT_FAILED,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId)
      }

      return NextResponse.json({ success: true })
    }

    // Pour les autres types d'événements
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
