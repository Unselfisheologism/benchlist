"use server"

import { getAllBenchmarkSources, getAllCategories, getCatalogStats } from "@/lib/benchmarks"
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
  chart_image_url: string | null
  chart_embed_url: string | null
  icon: string | null
  tags: string[] | null
  org: string | null
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

/** Get all benchmarks from the database, falling back to the full catalog */
export async function getAllBenchmarks(): Promise<BenchmarkSummary[]> {
  const supabase = await createClient()

  // Always merge catalog data — ensures ALL known benchmarks are shown
  const catalogSources = getAllBenchmarkSources()

  if (!supabase) {
    // No DB connection — return full catalog as source definitions
    return catalogSources.map((s) => ({
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
      chart_image_url: s.chart_image_url || null,
      chart_embed_url: s.chart_embed_url || null,
      icon: s.icon || null,
      tags: s.tags || null,
      org: s.org || null,
      leaderboard_data: [],
      total_models: 0,
      top_model: null,
      top_score: null,
      last_fetched_at: null,
      last_updated: null,
      fetch_status: "pending",
    }))
  }

  // Try to get live data from DB
  const { data: dbBenchmarks } = await supabase
    .from("ai_benchmarks")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })

  // Merge: catalog metadata + DB leaderboard data
  const dbMap = new Map<string, Record<string, unknown>>()
  if (dbBenchmarks) {
    for (const b of dbBenchmarks) {
      dbMap.set(b.slug, b)
    }
  }

  return catalogSources.map((s) => {
    const db = dbMap.get(s.slug)
    if (db) {
      return {
        id: (db.id as string) ?? s.slug,
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
        chart_image_url: s.chart_image_url || null,
        chart_embed_url: s.chart_embed_url || null,
        icon: s.icon || null,
        tags: s.tags || null,
        org: s.org || null,
        leaderboard_data: Array.isArray(db.leaderboard_data) ? db.leaderboard_data : [],
        total_models: (db.total_models as number) || 0,
        top_model: (db.top_model as string) || null,
        top_score: (db.top_score as number) || null,
        last_fetched_at: (db.last_fetched_at as string) || null,
        last_updated: (db.last_updated as string) || null,
        fetch_status: (db.fetch_status as string) || "pending",
      }
    }
    // No DB data — catalog entry only
    return {
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
      chart_image_url: s.chart_image_url || null,
      chart_embed_url: s.chart_embed_url || null,
      icon: s.icon || null,
      tags: s.tags || null,
      org: s.org || null,
      leaderboard_data: [],
      total_models: 0,
      top_model: null,
      top_score: null,
      last_fetched_at: null,
      last_updated: null,
      fetch_status: "pending",
    }
  })
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

/** Get all categories with counts */
export async function getCategoryList(): Promise<{ category: string; count: number }[]> {
  return getAllCategories().map((cat) => ({
    category: cat,
    count: getAllBenchmarkSources().filter((b) => b.category === cat).length,
  }))
}

/** Get catalog stats */
export async function getBenchmarkStats() {
  return getCatalogStats()
}
