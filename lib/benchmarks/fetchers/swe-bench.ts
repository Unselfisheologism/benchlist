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

// Well-known SWE-bench Verified results (updated periodically from the official site)
const SWE_BENCH_VERIFIED_FALLBACK = [
  { model: "OpenAI o3", score: 71.7 },
  { model: "OpenAI o4-mini", score: 69.1 },
  { model: "Anthropic Claude 3.5 Sonnet", score: 49.0 },
  { model: "OpenAI o1", score: 48.6 },
  { model: "Gemini 2.5 Pro", score: 63.8 },
  { model: "DeepSeek-V3-0324", score: 59.4 },
  { model: "GPT-4o", score: 38.4 },
  { model: "Llama 3.1 405B", score: 26.5 },
  { model: "Qwen2.5-Coder-32B", score: 33.4 },
]

async function fetchSwebenchLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch("https://www.swebench.com/", {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
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

    // Use parsed data if we got enough, otherwise fall back
    const finalEntries =
      entries.length >= 5
        ? entries.map((e, i) => ({
            ...e,
            rank: i + 1,
            date: new Date().toISOString().split("T")[0],
          }))
        : SWE_BENCH_VERIFIED_FALLBACK.map((e, i) => ({
            ...e,
            rank: i + 1,
            date: new Date().toISOString().split("T")[0],
          }))

    return {
      slug: "swe-bench-verified",
      entries: finalEntries,
      total_models: finalEntries.length,
      top_model: finalEntries[0]?.model || "Unknown",
      top_score: finalEntries[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    // Return fallback data on failure
    const fallback = SWE_BENCH_VERIFIED_FALLBACK.map((e, i) => ({
      ...e,
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))
    return {
      slug: "swe-bench-verified",
      entries: fallback,
      total_models: fallback.length,
      top_model: fallback[0]?.model || "Unknown",
      top_score: fallback[0]?.score || 0,
      last_updated: new Date().toISOString(),
      error: `Using cached data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export { SWE_BENCH_SOURCES, fetchSwebenchLeaderboard }
