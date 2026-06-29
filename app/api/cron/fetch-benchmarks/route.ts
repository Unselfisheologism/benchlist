import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

// Benchmark scraping logic
async function fetchBenchmarkData(sourceUrl: string): Promise<{
  benchmarkData: Record<string, unknown> | null
  lastUpdated: string | null
  error?: string
}> {
  try {
    // Skip if no source URL
    if (!sourceUrl) return { benchmarkData: null, lastUpdated: null }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Benchlist/1.0 (benchmark-directory-bot)",
      },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return { benchmarkData: null, lastUpdated: null, error: `HTTP ${res.status}` }
    }

    const contentType = res.headers.get("content-type") || ""
    let benchmarkData: Record<string, unknown> = {}

    if (contentType.includes("application/json")) {
      // JSON API endpoint
      const json = await res.json()
      benchmarkData = { raw: json, source: "json" }
    } else if (contentType.includes("text/html")) {
      // Parse HTML page — extract basic metadata
      const html = await res.text()
      // Try to extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      // Try to extract description from meta tags
      const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)
      // Try to extract og:image
      const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)

      benchmarkData = {
        title: titleMatch?.[1]?.trim() || null,
        description: descMatch?.[1]?.trim() || null,
        image: imageMatch?.[1]?.trim() || null,
        source: "html",
        url: sourceUrl,
        fetchedAt: new Date().toISOString(),
      }
    } else if (contentType.includes("text/csv")) {
      const text = await res.text()
      benchmarkData = { csvPreview: text.slice(0, 5000), source: "csv" }
    } else {
      const text = await res.text()
      benchmarkData = { preview: text.slice(0, 5000), source: contentType }
    }

    return {
      benchmarkData,
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return { benchmarkData: null, lastUpdated: null, error: message }
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    // Fetch all benchmarks that have a source_url and need updating
    // Update if never fetched, or last fetched more than 24 hours ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Get projects with null last_fetched_at or last_fetched_at < oneDayAgo
    const { data: benchmarksToUpdate } = await supabase
      .from("projects")
      .select("*")
      .or(`last_fetched_at.is.null,last_fetched_at.lt.${oneDayAgo}`)
      .not("source_url", "is", null)
      .limit(50) // Cap at 50 per run to avoid rate limits

    const results = []

    for (const bench of benchmarksToUpdate || []) {
      if (!bench.source_url) continue

      const result = await fetchBenchmarkData(bench.source_url)

      if (!result.error) {
        await supabase
          .from("projects")
          .update({
            benchmark_data: result.benchmarkData as Record<string, unknown>,
            last_fetched_at: new Date().toISOString(),
            last_updated: result.lastUpdated || bench.last_updated,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bench.id)
      }

      results.push({
        name: bench.name,
        slug: bench.slug,
        sourceUrl: bench.source_url,
        success: !result.error,
        error: result.error || null,
      })

      // Small delay between requests to be respectful
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return NextResponse.json({
      fetched: results.length,
      updated: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("Benchmark fetch cron error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST — manual single-benchmark fetch (called from dashboard/submit form)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug } = body

    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: benches } = await supabase.from("projects").select("*").eq("slug", slug).limit(1)

    if (!benches || benches.length === 0) {
      return NextResponse.json({ error: "Benchmark not found" }, { status: 404 })
    }

    const bench = benches[0]
    if (!bench.source_url) {
      return NextResponse.json(
        { error: "No sourceUrl configured for this benchmark" },
        { status: 400 },
      )
    }

    const result = await fetchBenchmarkData(bench.source_url)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    await supabase
      .from("projects")
      .update({
        benchmark_data: result.benchmarkData as Record<string, unknown>,
        last_fetched_at: new Date().toISOString(),
        last_updated: result.lastUpdated || bench.last_updated,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bench.id)

    return NextResponse.json({
      name: bench.name,
      success: true,
      lastFetchedAt: new Date().toISOString(),
      benchmarkData: result.benchmarkData,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
