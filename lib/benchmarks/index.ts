/**
 * AI Benchmarks — central registry
 *
 * All benchmark sources and their fetch functions are registered here.
 * The cron job calls `fetchAllBenchmarks()` to update everything.
 */
import { AIDER_SOURCES, fetchAiderLeaderboard } from "./fetchers/aider"
import { ARC_AGI_SOURCES, fetchArcAgiLeaderboard } from "./fetchers/arc-agi"
import { fetchHuggingFaceLeaderboard, HUGGINGFACE_SOURCES } from "./fetchers/huggingface"
import { fetchLiveCodeBenchLeaderboard, LIVECODEBENCH_SOURCES } from "./fetchers/livecodebench"
import { fetchLmsysLeaderboard, LMSYS_SOURCES } from "./fetchers/lmsys"
import { fetchMmluLeaderboard, MMLU_SOURCES } from "./fetchers/mmlu"
import { fetchSwebenchLeaderboard, SWE_BENCH_SOURCES } from "./fetchers/swe-bench"
import type { BenchmarkDef, BenchmarkSource, FetchResult } from "./types"

/** All registered benchmark definitions */
const ALL_BENCHMARKS: BenchmarkDef[] = [
  // SWE-bench
  ...SWE_BENCH_SOURCES.map((s) => ({ ...s, fetch: fetchSwebenchLeaderboard })),
  // ARC-AGI
  ...ARC_AGI_SOURCES.map((s) => ({ ...s, fetch: fetchArcAgiLeaderboard })),
  // Aider
  ...AIDER_SOURCES.map((s) => ({ ...s, fetch: fetchAiderLeaderboard })),
  // LMSYS
  ...LMSYS_SOURCES.map((s) => ({ ...s, fetch: fetchLmsysLeaderboard })),
  // MMLU / GPQA / AIME / HumanEval
  ...MMLU_SOURCES.map((s) => ({ ...s, fetch: fetchMmluLeaderboard })),
  // LiveCodeBench
  ...LIVECODEBENCH_SOURCES.map((s) => ({ ...s, fetch: fetchLiveCodeBenchLeaderboard })),
  // HuggingFace
  ...HUGGINGFACE_SOURCES.map((s) => ({ ...s, fetch: fetchHuggingFaceLeaderboard })),
]

/** Get all benchmark source metadata (no fetch) */
export function getAllBenchmarkSources(): BenchmarkSource[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return ALL_BENCHMARKS.map(({ fetch: _fn, ...rest }) => rest)
}

/** Get a single benchmark source by slug */
export function getBenchmarkSource(slug: string): BenchmarkSource | undefined {
  return ALL_BENCHMARKS.find((b) => b.slug === slug)
}

/** Fetch a single benchmark by slug */
export async function fetchBenchmark(slug: string): Promise<FetchResult | null> {
  const def = ALL_BENCHMARKS.find((b) => b.slug === slug)
  if (!def) return null
  return def.fetch()
}

/**
 * Fetch ALL benchmarks. Runs each fetcher with a delay between calls.
 * Returns results keyed by slug.
 */
export async function fetchAllBenchmarks(): Promise<
  Map<string, FetchResult & { source: BenchmarkSource }>
> {
  const results = new Map<string, FetchResult & { source: BenchmarkSource }>()

  for (const def of ALL_BENCHMARKS) {
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
    // Respectful delay between fetchers
    await new Promise((r) => setTimeout(r, 1000))
  }

  return results
}

export type { BenchmarkDef, BenchmarkSource, FetchResult }
