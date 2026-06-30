"use server"

import { getAllBenchmarkSources } from "@/lib/benchmarks"
import { createClient } from "@/lib/supabase/server"

export interface BenchmarkSummary {
  id: string
  slug: string
  name: string
  description: string
  category: string
  source_type: string
  methodology: string | null
  paper_url: string | null
  repo_url: string | null
  website_url: string | null
  logo_url: string | null
  source_url: string | null
  leaderboard_data: Array<{
    model: string
    score: number
    rank?: number
    date?: string
  }>
  total_models: number
  top_model: string | null
  top_score: number | null
  last_fetched_at: string | null
  last_updated: string | null
  fetch_status: string
  fetch_error?: string | null
}

/** Get all benchmarks from the database, falling back to source definitions */
export async function getAllBenchmarks(): Promise<BenchmarkSummary[]> {
  const supabase = await createClient()

  if (!supabase) {
    // No DB connection — return source definitions only
    return getAllBenchmarkSources().map((s) => ({
      id: s.slug,
      slug: s.slug,
      name: s.name,
      description: s.description,
      category: s.category,
      source_type: s.source_type,
      methodology: s.methodology || null,
      paper_url: s.paper_url || null,
      repo_url: s.repo_url || null,
      website_url: s.website_url || null,
      logo_url: s.logo_url || null,
      source_url: s.source_url,
      leaderboard_data: [],
      total_models: 0,
      top_model: null,
      top_score: null,
      last_fetched_at: null,
      last_updated: null,
      fetch_status: "pending",
    }))
  }

  // Try to get from DB first
  const { data: dbBenchmarks } = await supabase
    .from("ai_benchmarks")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  if (dbBenchmarks && dbBenchmarks.length > 0) {
    return dbBenchmarks.map((b: Record<string, unknown>) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      description: b.description || "",
      category: b.category || "general",
      source_type: b.source_type || "manual",
      methodology: b.methodology || null,
      paper_url: b.paper_url || null,
      repo_url: b.repo_url || null,
      website_url: b.website_url || null,
      logo_url: b.logo_url || null,
      source_url: b.source_url || null,
      leaderboard_data: Array.isArray(b.leaderboard_data) ? b.leaderboard_data : [],
      total_models: b.total_models || 0,
      top_model: b.top_model || null,
      top_score: b.top_score || null,
      last_fetched_at: b.last_fetched_at || null,
      last_updated: b.last_updated || null,
      fetch_status: b.fetch_status || "pending",
    }))
  }

  // Fallback to source definitions (no DB data yet)
  return getAllBenchmarkSources().map((s) => ({
    id: s.slug,
    slug: s.slug,
    name: s.name,
    description: s.description,
    category: s.category,
    source_type: s.source_type,
    methodology: s.methodology || null,
    paper_url: s.paper_url || null,
    repo_url: s.repo_url || null,
    website_url: s.website_url || null,
    logo_url: s.logo_url || null,
    source_url: s.source_url,
    leaderboard_data: [],
    total_models: 0,
    top_model: null,
    top_score: null,
    last_fetched_at: null,
    last_updated: null,
    fetch_status: "pending",
  }))
}

/** Get benchmarks grouped by category */
export async function getBenchmarksByCategory(): Promise<Record<string, BenchmarkSummary[]>> {
  const benchmarks = await getAllBenchmarks()
  const grouped: Record<string, BenchmarkSummary[]> = {}

  for (const b of benchmarks) {
    const cat = b.category || "general"
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(b)
  }

  return grouped
}
