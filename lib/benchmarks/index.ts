/**
 * AI Benchmarks — central registry
 *
 * Uses the BENCHMARK_CATALOG as the single source of truth for ALL known benchmarks.
 * Only benchmarks with fetchers can be actively updated; the rest are catalog-only
 * entries showing their information and linking to external charts.
 *
 * Tiered architecture:
 * - Tier 1 (Aggregators): Epoch AI, LMSYS, HF Open LLM, HELM, AlpacaEval
 * - Tier 2 (Direct): SWE-bench, ARC-AGI, Aider, LiveCodeBench, MCP-Bench, Terminal-Bench
 * - Tier 3 (Catalog-only): Every other benchmark in existence — shown with links & charts
 * - Tier 4 (Discovery): arXiv, HF Daily Papers
 */
import { BENCHMARK_CATALOG, searchCatalog } from "./catalog"
import { fetchAiderLeaderboard } from "./fetchers/aider"
import { fetchArcAgiLeaderboard } from "./fetchers/arc-agi"
import { fetchEpochECI, fetchEpochFrontierMath } from "./fetchers/epoch-ai"
import { fetchHuggingFaceLeaderboard } from "./fetchers/huggingface"
import { fetchLiveCodeBenchLeaderboard } from "./fetchers/livecodebench"
import { fetchLmsysLeaderboard } from "./fetchers/lmsys"
import { fetchMcpBenchLeaderboard } from "./fetchers/mcp-bench"
import {
  fetchAimeLeaderboard,
  fetchGpqaLeaderboard,
  fetchHumanevalLeaderboard,
  fetchMmluLeaderboard,
} from "./fetchers/mmlu"
import { fetchSwebenchLeaderboard } from "./fetchers/swe-bench"
import { fetchTerminalBenchLeaderboard } from "./fetchers/terminal-bench"
import type { BenchmarkDef, BenchmarkSource, FetchResult } from "./types"

// Re-export normalize utilities for use by other modules
export { normalizeModelName, normalizeEntries, getModelMetadata } from "./normalize"
export type { NormalizedModel } from "./normalize"

// Re-export discovery for the cron/API layer
export { searchArxivBenchmarks, enrichWithTrackingStatus } from "./discovery"
export { fetchHFDailyPapers } from "./fetchers/hf-papers"
export type { BenchmarkDiscovery } from "./types"

// Re-export catalog for search/filter
export { searchCatalog } from "./catalog"
export { BENCHMARK_CATALOG } from "./catalog"

// ═══════════════════════════════════════════════════════════════════════
// BENCHMARKS WITH ACTIVE FETCHERS (can be auto-updated via cron)
// ═══════════════════════════════════════════════════════════════════════

/** Map of slugs to fetch functions for benchmarks that have active fetchers */
const FETCHER_MAP: Record<string, () => Promise<FetchResult>> = {
  // Tier 1: Aggregators
  "chatbot-arena": fetchLmsysLeaderboard,
  "epoch-frontiermath": fetchEpochFrontierMath,
  "epoch-eci": fetchEpochECI,
  "open-llm-leaderboard": fetchHuggingFaceLeaderboard,

  // Tier 2: Direct sources
  "swe-bench-verified": fetchSwebenchLeaderboard,
  "arc-agi-pub": fetchArcAgiLeaderboard,
  "aider-polyglot": fetchAiderLeaderboard,
  livecodebench: fetchLiveCodeBenchLeaderboard,
  "mcp-bench": fetchMcpBenchLeaderboard,
  "terminal-bench": fetchTerminalBenchLeaderboard,

  // Academic benchmarks
  "mmlu-pro": fetchMmluLeaderboard,
  "gpqa-diamond": fetchGpqaLeaderboard,
  "aime-2024": fetchAimeLeaderboard,
  humaneval: fetchHumanevalLeaderboard,

  // HLE (static data)
  hle: async () => ({
    slug: "hle",
    entries: [
      { model: "OpenAI o3", score: 9.9, rank: 1 },
      { model: "Gemini 2.5 Pro", score: 8.2, rank: 2 },
      { model: "Claude 3.5 Sonnet", score: 6.5, rank: 3 },
    ],
    total_models: 3,
    top_model: "OpenAI o3",
    top_score: 9.9,
    last_updated: new Date().toISOString(),
  }),
}

/** Build the complete list of BenchmarkDef — catalog entries with fetchers where available */
const ALL_BENCHMARKS: BenchmarkDef[] = BENCHMARK_CATALOG.map((src) => ({
  ...src,
  fetch:
    FETCHER_MAP[src.slug] ??
    (async () => ({
      slug: src.slug,
      entries: [],
      total_models: 0,
      top_model: "",
      top_score: 0,
      last_updated: new Date().toISOString(),
    })),
}))

/**
 * Get ALL benchmark sources — the entire catalog, not just fetchable ones.
 * This is the primary data source for the UI.
 */
export function getAllBenchmarkSources(): BenchmarkSource[] {
  return BENCHMARK_CATALOG
}

/**
 * Get only benchmark sources that have active fetchers
 */
export function getFetchableBenchmarkSources(): BenchmarkSource[] {
  return BENCHMARK_CATALOG.filter((b) => b.slug in FETCHER_MAP)
}

/**
 * Search the catalog by query, category, or org.
 */
export function searchBenchmarks(
  query?: string,
  category?: string,
  org?: string,
): BenchmarkSource[] {
  return searchCatalog(query, category, org)
}

/** Get a single benchmark source by slug */
export function getBenchmarkSource(slug: string): BenchmarkSource | undefined {
  return BENCHMARK_CATALOG.find((b) => b.slug === slug)
}

/** Fetch a single benchmark by slug (only works for benchmarks with fetchers) */
export async function fetchBenchmark(slug: string): Promise<FetchResult | null> {
  const def = ALL_BENCHMARKS.find((b) => b.slug === slug)
  if (!def) return null
  return def.fetch()
}

/**
 * Fetch ALL benchmarks that have active fetchers.
 * Runs sequentially to stay within CF Workers CPU time limit.
 */
export async function fetchAllBenchmarks(): Promise<
  Map<string, FetchResult & { source: BenchmarkSource }>
> {
  const results = new Map<string, FetchResult & { source: BenchmarkSource }>()

  for (const def of ALL_BENCHMARKS) {
    if (!(def.slug in FETCHER_MAP)) continue
    try {
      const result = await def.fetch()
      results.set(def.slug, { ...result, source: def })
    } catch (error) {
      results.set(def.slug, {
        slug: def.slug,
        entries: [],
        total_models: 0,
        top_model: "",
        top_score: 0,
        last_updated: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        source: def,
      })
    }
  }

  return results
}

/**
 * Get all unique categories from the catalog
 */
export function getAllCategories(): string[] {
  const cats = new Set(BENCHMARK_CATALOG.map((b) => b.category))
  return Array.from(cats).sort()
}

/**
 * Get all unique organizations from the catalog
 */
export function getAllOrganizations(): string[] {
  const orgs = new Set(BENCHMARK_CATALOG.map((b) => b.org).filter(Boolean))
  return Array.from(orgs).sort() as string[]
}

/**
 * Get catalog stats
 */
export function getCatalogStats() {
  return {
    total: BENCHMARK_CATALOG.length,
    withFetchers: Object.keys(FETCHER_MAP).length,
    categories: getAllCategories().length,
    organizations: getAllOrganizations().length,
    byCategory: getAllCategories().map((cat) => ({
      category: cat,
      count: BENCHMARK_CATALOG.filter((b) => b.category === cat).length,
    })),
  }
}

export type { BenchmarkDef, BenchmarkSource, FetchResult }
