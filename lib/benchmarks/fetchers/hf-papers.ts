/**
 * HuggingFace Daily Papers fetcher
 *
 * Monitors trending papers on HuggingFace for new benchmark announcements.
 * HF has a daily papers page that surfaces community-interesting research.
 */
import type { BenchmarkDiscovery } from "../types"

const HF_PAPERS_API = "https://huggingface.co/api/daily_papers"

/** Keywords that indicate a benchmark-related paper */
const BENCHMARK_SIGNALS = [
  "benchmark",
  "leaderboard",
  "evaluation",
  "eval",
  "comparing models",
  "model performance",
  "frontier",
  "capability",
  "assessment",
]

/**
 * Fetch trending papers from HuggingFace Daily Papers.
 *
 * @param maxResults - Maximum papers to return
 */
export async function fetchHFDailyPapers(maxResults: number = 20): Promise<BenchmarkDiscovery[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(HF_PAPERS_API, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Benchlist/1.0 (AI Benchmark Aggregator)",
        Accept: "application/json",
      },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = (await res.json()) as Array<{
      paper?: {
        id?: string
        title?: string
        summary?: string
        publishedAt?: string
        authors?: Array<{ name?: string }>
      }
      numUpvotes?: number
    }>

    if (!Array.isArray(data)) return []

    const results: BenchmarkDiscovery[] = []

    for (const item of data.slice(0, maxResults)) {
      const paper = item.paper
      if (!paper?.title) continue

      const combined = `${paper.title} ${paper.summary || ""}`.toLowerCase()
      const isBenchmark = BENCHMARK_SIGNALS.some((signal) => combined.includes(signal))

      if (isBenchmark) {
        results.push({
          title: paper.title,
          url: paper.id ? `https://huggingface.co/papers/${paper.id}` : "",
          summary: (paper.summary || "").slice(0, 500),
          published: paper.publishedAt || new Date().toISOString(),
          source: "hf-papers",
          already_tracked: false,
        })
      }
    }

    return results
  } catch (error) {
    console.error("[hf-papers] Fetch failed:", error)
    return []
  }
}
