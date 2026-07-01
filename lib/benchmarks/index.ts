/**
 * AI Benchmarks — central registry
 *
 * All benchmark sources and their fetch functions are registered here.
 * The cron job calls `fetchAllBenchmarks()` to update everything.
 *
 * Tiered architecture:
 * - Tier 1 (Aggregators): Epoch AI, LMSYS, HF Open LLM
 * - Tier 2 (Direct): SWE-bench, ARC-AGI, Aider, LiveCodeBench, MCP-Bench, Terminal-Bench
 * - Tier 3 (Discovery): arXiv, HF Daily Papers
 */
import { AIDER_SOURCES, fetchAiderLeaderboard } from "./fetchers/aider"
import { ARC_AGI_SOURCES, fetchArcAgiLeaderboard } from "./fetchers/arc-agi"
import { EPOCH_AI_SOURCES, fetchEpochECI, fetchEpochFrontierMath } from "./fetchers/epoch-ai"
import { fetchHuggingFaceLeaderboard, HUGGINGFACE_SOURCES } from "./fetchers/huggingface"
import { fetchLiveCodeBenchLeaderboard, LIVECODEBENCH_SOURCES } from "./fetchers/livecodebench"
import { fetchLmsysLeaderboard, LMSYS_SOURCES } from "./fetchers/lmsys"
import { fetchMcpBenchLeaderboard, MCP_BENCH_SOURCES } from "./fetchers/mcp-bench"
import {
  fetchAimeLeaderboard,
  fetchGpqaLeaderboard,
  fetchHumanevalLeaderboard,
  fetchMmluLeaderboard,
  MMLU_SOURCES,
} from "./fetchers/mmlu"
import { fetchSwebenchLeaderboard, SWE_BENCH_SOURCES } from "./fetchers/swe-bench"
import { fetchTerminalBenchLeaderboard, TERMINAL_BENCH_SOURCES } from "./fetchers/terminal-bench"
import type { BenchmarkDef, BenchmarkSource, FetchResult } from "./types"

// Re-export normalize utilities for use by other modules
export { normalizeModelName, normalizeEntries, getModelMetadata } from "./normalize"
export type { NormalizedModel } from "./normalize"

// Re-export discovery for the cron/API layer
export { searchArxivBenchmarks, enrichWithTrackingStatus } from "./discovery"
export { fetchHFDailyPapers } from "./fetchers/hf-papers"
export type { BenchmarkDiscovery } from "./types"

/** All registered benchmark definitions */
const ALL_BENCHMARKS: BenchmarkDef[] = [
  // ── Tier 1: Aggregators ──────────────────────────────────────
  // LMSYS Chatbot Arena (human preference Elo)
  {
    ...LMSYS_SOURCES[0],
    fetch: fetchLmsysLeaderboard,
  },
  // Epoch AI — FrontierMath
  {
    ...EPOCH_AI_SOURCES[0],
    fetch: fetchEpochFrontierMath,
  },
  // Epoch AI — ECI (composite index)
  {
    ...EPOCH_AI_SOURCES[1],
    fetch: fetchEpochECI,
  },
  // Open LLM Leaderboard (HF)
  {
    ...HUGGINGFACE_SOURCES[0],
    fetch: fetchHuggingFaceLeaderboard,
  },

  // ── Tier 2: Direct Sources ───────────────────────────────────
  // SWE-bench Verified
  {
    ...SWE_BENCH_SOURCES[0],
    fetch: fetchSwebenchLeaderboard,
  },
  // ARC-AGI
  {
    ...ARC_AGI_SOURCES[0],
    fetch: fetchArcAgiLeaderboard,
  },
  // Aider Polyglot
  {
    ...AIDER_SOURCES[0],
    fetch: fetchAiderLeaderboard,
  },
  // LiveCodeBench
  {
    ...LIVECODEBENCH_SOURCES[0],
    fetch: fetchLiveCodeBenchLeaderboard,
  },
  // MCP-Bench (HF Spaces)
  {
    ...MCP_BENCH_SOURCES[0],
    fetch: fetchMcpBenchLeaderboard,
  },
  // Terminal-Bench (HF Spaces)
  {
    ...TERMINAL_BENCH_SOURCES[0],
    fetch: fetchTerminalBenchLeaderboard,
  },

  // ── Academic Benchmarks ──────────────────────────────────────
  // MMLU-Pro
  { ...MMLU_SOURCES[0], fetch: fetchMmluLeaderboard },
  // GPQA Diamond
  { ...MMLU_SOURCES[1], fetch: fetchGpqaLeaderboard },
  // AIME 2024
  { ...MMLU_SOURCES[2], fetch: fetchAimeLeaderboard },
  // HumanEval
  { ...MMLU_SOURCES[3], fetch: fetchHumanevalLeaderboard },

  // ── Tier 1: Human Preference ─────────────────────────────────
  // Chatbot Arena — Coding subset
  {
    ...LMSYS_SOURCES[1],
    fetch: fetchLmsysLeaderboard, // Uses same fetcher, returns overall arena
  },
  // Humanity's Last Exam
  {
    ...HUGGINGFACE_SOURCES[1],
    fetch: async () => ({
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
