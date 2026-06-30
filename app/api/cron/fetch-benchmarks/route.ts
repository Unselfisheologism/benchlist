import { NextRequest, NextResponse } from "next/server"

import { fetchAllBenchmarks, getAllBenchmarkSources } from "@/lib/benchmarks"
import { createClient } from "@/lib/supabase/server"

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
    const supabase = await createClient()
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
        // Insert new benchmark definition
        await supabase.from("ai_benchmarks").insert({
          slug: source.slug,
          name: source.name,
          description: source.description,
          category: source.category,
          source_type: source.source_type,
          source_url: source.source_url,
          methodology: source.methodology || null,
          paper_url: source.paper_url || null,
          repo_url: source.repo_url || null,
          logo_url: source.logo_url || null,
          website_url: source.website_url || null,
          is_active: true,
          fetch_status: "pending",
        })
      }
    }

    // Fetch all benchmark data
    const results = await fetchAllBenchmarks()

    // Update DB with fetched data
    const updates = []
    for (const [slug, result] of results) {
      const updateData = {
        leaderboard_data: result.entries,
        total_models: result.total_models,
        top_model: result.top_model || null,
        top_score: result.top_score || null,
        last_fetched_at: new Date().toISOString(),
        last_updated: result.last_updated,
        fetch_status: result.error ? "error" : "success",
        fetch_error: result.error || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("ai_benchmarks").update(updateData).eq("slug", slug)

      updates.push({
        slug,
        success: !error,
        models: result.total_models,
        topModel: result.top_model,
        error: error?.message || result.error || null,
      })
    }

    const successCount = updates.filter((u) => u.success && !u.error).length
    const errorCount = updates.filter((u) => !u.success || u.error).length

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      total: results.size,
      success: successCount,
      errors: errorCount,
      results: updates,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("Benchmark fetch cron error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/cron/fetch-benchmarks
 *
 * Manual trigger: fetch a single benchmark by slug.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug } = body

    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 })
    }

    const { fetchBenchmark } = await import("@/lib/benchmarks")
    const result = await fetchBenchmark(slug)

    if (!result) {
      return NextResponse.json({ error: `Unknown benchmark: ${slug}` }, { status: 404 })
    }

    // Update DB
    const { error } = await supabase
      .from("ai_benchmarks")
      .update({
        leaderboard_data: result.entries,
        total_models: result.total_models,
        top_model: result.top_model || null,
        top_score: result.top_score || null,
        last_fetched_at: new Date().toISOString(),
        last_updated: result.last_updated,
        fetch_status: result.error ? "error" : "success",
        fetch_error: result.error || null,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      slug,
      success: !result.error,
      models: result.total_models,
      topModel: result.top_model,
      entries: result.entries.slice(0, 10), // Top 10 only
      error: result.error || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
