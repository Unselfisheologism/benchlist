/**
 * LiveCodeBench leaderboard fetcher
 * Source: https://livecodebench.github.io/
 */
import type { BenchmarkSource, FetchResult } from "../types"

const LIVECODEBENCH_SOURCES: BenchmarkSource[] = [
  {
    slug: "livecodebench",
    name: "LiveCodeBench",
    description:
      "Holistic and contamination-free evaluation of LLMs for code. Continuously collects new problems over time to prevent data leakage.",
    category: "coding",
    source_type: "livecodebench",
    source_url: "https://livecodebench.github.io/leaderboard.html",
    methodology:
      "Problems sourced from recent competitive programming contests. Models must generate correct code within time limits. Contamination-free by design.",
    paper_url: "https://arxiv.org/abs/2403.07974",
    repo_url: "https://github.com/LiveCodeBench/LiveCodeBench",
    website_url: "https://livecodebench.github.io/",
  },
]

async function fetchLiveCodeBenchLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch("https://livecodebench.github.io/leaderboard.html", {
      signal: controller.signal,
      headers: { "User-Agent": "Benchlist/1.0 (benchmark-directory-bot)" },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const entries: { model: string; score: number }[] = []

    // Parse leaderboard table
    const rowRegex =
      /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi
    let match
    while ((match = rowRegex.exec(html)) !== null) {
      const model = match[1].replace(/<[^>]+>/g, "").trim()
      const scoreStr = match[2]
        .replace(/<[^>]+>/g, "")
        .trim()
        .replace("%", "")
      const score = parseFloat(scoreStr)
      if (model && !isNaN(score) && score > 0 && score <= 100) {
        entries.push({ model, score })
      }
    }

    entries.sort((a, b) => b.score - a.score)

    const ranked = entries.map((e, i) => ({
      ...e,
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))

    return {
      slug: "livecodebench",
      entries: ranked,
      total_models: ranked.length,
      top_model: ranked[0]?.model || "Unknown",
      top_score: ranked[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    return {
      slug: "livecodebench",
      entries: [],
      total_models: 0,
      top_model: "",
      top_score: 0,
      last_updated: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { LIVECODEBENCH_SOURCES, fetchLiveCodeBenchLeaderboard }
