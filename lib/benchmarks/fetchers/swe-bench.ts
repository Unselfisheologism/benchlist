/**
 * SWE-bench Verified leaderboard fetcher
 * Source: https://www.swebench.com/
 */
import type { BenchmarkSource, FetchResult } from "../types"

const SWE_BENCH_SOURCES: BenchmarkSource[] = [
  {
    slug: "swe-bench-verified",
    name: "SWE-bench Verified",
    description:
      "Human-verified subset of SWE-bench. Measures ability to resolve real GitHub issues from popular Python repositories.",
    category: "coding",
    source_type: "swe-bench",
    source_url: "https://www.swebench.com/",
    methodology:
      "Models are given a GitHub issue and must generate a patch that passes the held-out test suite. Verified by humans.",
    paper_url: "https://arxiv.org/abs/2310.06770",
    repo_url: "https://github.com/princeton-nlp/SWE-bench",
    website_url: "https://www.swebench.com/",
  },
  {
    slug: "swe-bench-multimodal",
    name: "SWE-bench Multimodal",
    description:
      "Extension of SWE-bench for repositories requiring UI, screenshots, or visual context to resolve issues.",
    category: "coding",
    source_type: "swe-bench",
    source_url: "https://www.swebench.com/",
    methodology:
      "Like SWE-bench Verified but for repos with visual elements — CSS, HTML, React components.",
    paper_url: "https://arxiv.org/abs/2410.07095",
    repo_url: "https://github.com/princeton-nlp/SWE-bench",
    website_url: "https://www.swebench.com/",
  },
]

async function fetchSwebenchLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch("https://www.swebench.com/", {
      signal: controller.signal,
      headers: { "User-Agent": "Benchlist/1.0 (benchmark-directory-bot)" },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const entries: { model: string; score: number }[] = []

    // Parse leaderboard table from HTML
    const rowRegex =
      /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi
    let match
    while ((match = rowRegex.exec(html)) !== null) {
      const model = match[1].replace(/<[^>]+>/g, "").trim()
      const scoreStr = match[2].replace(/<[^>]+>/g, "").trim()
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
      slug: "swe-bench-verified",
      entries: ranked,
      total_models: ranked.length,
      top_model: ranked[0]?.model || "Unknown",
      top_score: ranked[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    return {
      slug: "swe-bench-verified",
      entries: [],
      total_models: 0,
      top_model: "",
      top_score: 0,
      last_updated: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { SWE_BENCH_SOURCES, fetchSwebenchLeaderboard }
