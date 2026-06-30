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
import {
  fetchAimeLeaderboard,
  fetchGpqaLeaderboard,
  fetchHumanevalLeaderboard,
  fetchMmluLeaderboard,
  MMLU_SOURCES,
} from "./fetchers/mmlu"
import { fetchSwebenchLeaderboard, SWE_BENCH_SOURCES } from "./fetchers/swe-bench"
import type { BenchmarkDef, BenchmarkSource, FetchResult } from "./types"

/** All registered benchmark definitions */
const ALL_BENCHMARKS: BenchmarkDef[] = [
  // SWE-bench (both variants from one fetcher)
  {
    ...SWE_BENCH_SOURCES[0],
    fetch: fetchSwebenchLeaderboard,
  },
  // ARC-AGI (first one live-fetches, second returns cached)
  {
    ...ARC_AGI_SOURCES[0],
    fetch: fetchArcAgiLeaderboard,
  },
  // Aider (both variants from one fetcher)
  {
    ...AIDER_SOURCES[0],
    fetch: fetchAiderLeaderboard,
  },
  // LMSYS (live-fetches overall arena)
  {
    ...LMSYS_SOURCES[0],
    fetch: fetchLmsysLeaderboard,
  },
  // MMLU-Pro
  { ...MMLU_SOURCES[0], fetch: fetchMmluLeaderboard },
  // GPQA Diamond
  { ...MMLU_SOURCES[1], fetch: fetchGpqaLeaderboard },
  // AIME 2024
  { ...MMLU_SOURCES[2], fetch: fetchAimeLeaderboard },
  // HumanEval
  { ...MMLU_SOURCES[3], fetch: fetchHumanevalLeaderboard },
  // LiveCodeBench
  {
    ...LIVECODEBENCH_SOURCES[0],
    fetch: fetchLiveCodeBenchLeaderboard,
  },
  // Open LLM Leaderboard (HF)
  {
    ...HUGGINGFACE_SOURCES[0],
    fetch: fetchHuggingFaceLeaderboard,
  },
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
 * Fetch ALL benchmarks. Runs each fetcher sequentially (no delay) to stay
 * within CF Workers CPU time limit. Each fetcher has its own timeout.
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
  }

  return results
}

export type { BenchmarkDef, BenchmarkSource, FetchResult }
