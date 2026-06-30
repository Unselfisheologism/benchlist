import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@supabase/supabase-js"

import { fetchAllBenchmarks, getAllBenchmarkSources } from "@/lib/benchmarks"

/**
 * Create a direct Supabase client for cron/API routes.
 * Tries process.env first, then falls back to hardcoded values
 * for Cloudflare Workers where NEXT_PUBLIC_* vars may not be in process.env.
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key || !url.startsWith("http")) {
    console.error("[cron] Missing Supabase env vars:", {
      hasUrl: !!url,
      hasKey: !!key,
      urlValue: url ? url.substring(0, 30) + "..." : "undefined",
    })
    return null
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * GET /api/cron/fetch-benchmarks
 *
 * Cron job: fetches all AI benchmark leaderboard data from official sources
 * and stores it in the ai_benchmarks table.
 *
 * Auth: Bearer token via CRON_API_KEY env var.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    // Ensure all benchmark source definitions exist in the DB
    const sources = getAllBenchmarkSources()
    for (const source of sources) {
      const { data: existing } = await supabase
        .from("ai_benchmarks")
        .select("id")
        .eq("slug", source.slug)
        .limit(1)

      if (!existing || existing.length === 0) {
        const { error } = await supabase.from("ai_benchmarks").insert({
          slug: source.slug,
          name: source.name,
          description: source.description || "",
          category: source.category,
          source_url: source.source_url,
          source_type: source.source_type,
          leaderboard_data: [],
          total_models: 0,
          fetch_status: "pending",
        })
        if (error) {
          console.error(`Failed to insert ${source.slug}:`, error.message)
        }
      }
    }

    // Fetch all benchmark data — returns a Map
    const resultsMap = await fetchAllBenchmarks()

    // Store results in the database
    const updates: Array<{
      slug: string
      success: boolean
      models: number
      topModel: string
      error: string | null
    }> = []

    for (const [slug, result] of resultsMap) {
      const top_model = result.entries.length > 0 ? result.entries[0].model : ""

      const updateData = {
        leaderboard_data: result.entries as unknown as Record<string, unknown>[],
        total_models: result.entries.length,
        top_model,
        top_score: result.entries.length > 0 ? result.entries[0].score : null,
        last_fetched_at: new Date().toISOString(),
        fetch_status: result.total_models > 0 ? "success" : "error",
        fetch_error: result.total_models > 0 ? null : result.error || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("ai_benchmarks").update(updateData).eq("slug", slug)

      updates.push({
        slug,
        success: result.total_models > 0,
        models: result.total_models,
        topModel: top_model,
        error: error?.message || result.error || null,
      })
    }

    const successCount = updates.filter((u) => u.success).length
    const errorCount = updates.filter((u) => !u.success).length

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      total: resultsMap.size,
      success: successCount,
      errors: errorCount,
      results: updates,
    })
  } catch (error) {
    console.error("[cron] Benchmark fetch failed:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    )
  }
}

/**
 * POST /api/cron/fetch-benchmarks
 *
 * POST handler for Cloudflare Cron Triggers.
 * Same logic as GET, but triggered by cron schedule.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronHeader = req.headers.get("cf-cron-invocation")

  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_API_KEY}` ||
    (cronHeader && cronHeader === process.env.CRON_API_KEY)

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    const sources = getAllBenchmarkSources()
    for (const source of sources) {
      const { data: existing } = await supabase
        .from("ai_benchmarks")
        .select("id")
        .eq("slug", source.slug)
        .limit(1)

      if (!existing || existing.length === 0) {
        await supabase.from("ai_benchmarks").insert({
          slug: source.slug,
          name: source.name,
          description: source.description || "",
          category: source.category,
          source_url: source.source_url,
          source_type: source.source_type,
          leaderboard_data: [],
          total_models: 0,
          fetch_status: "pending",
        })
      }
    }

    const resultsMap = await fetchAllBenchmarks()

    const updates: Array<{
      slug: string
      success: boolean
      models: number
      topModel: string
      error: string | null
    }> = []

    for (const [slug, result] of resultsMap) {
      const top_model = result.entries.length > 0 ? result.entries[0].model : ""

      const updateData = {
        leaderboard_data: result.entries as unknown as Record<string, unknown>[],
        total_models: result.entries.length,
        top_model,
        top_score: result.entries.length > 0 ? result.entries[0].score : null,
        last_fetched_at: new Date().toISOString(),
        fetch_status: result.total_models > 0 ? "success" : "error",
        fetch_error: result.total_models > 0 ? null : result.error || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("ai_benchmarks").update(updateData).eq("slug", slug)

      updates.push({
        slug,
        success: result.total_models > 0,
        models: result.entries.length,
        topModel: top_model,
        error: error?.message || result.error || null,
      })
    }

    const successCount = updates.filter((u) => u.success).length
    const errorCount = updates.filter((u) => !u.success).length

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      total: resultsMap.size,
      success: successCount,
      errors: errorCount,
      results: updates,
    })
  } catch (error) {
    console.error("[cron] Benchmark fetch failed:", error)
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    )
  }
}
