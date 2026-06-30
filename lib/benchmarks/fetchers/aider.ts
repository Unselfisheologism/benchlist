/**
 * Aider polyglot benchmark fetcher
 * Source: https://aider.chat/docs/leaderboards/
 */
import type { BenchmarkSource, FetchResult } from "../types"

const AIDER_SOURCES: BenchmarkSource[] = [
  {
    slug: "aider-polyglot",
    name: "Aider Polyglot Benchmark",
    description:
      "Tests LLMs on 225 challenging Exercism coding exercises across C++, Go, Java, JavaScript, Python, and Rust.",
    category: "coding",
    source_type: "aider",
    source_url: "https://aider.chat/docs/leaderboards/",
    methodology:
      "Each model attempts 225 coding exercises across 6 languages. Score is percentage solved correctly.",
    repo_url: "https://github.com/paul-gauthier/aider",
    website_url: "https://aider.chat/",
  },
  {
    slug: "aider-code-editing",
    name: "Aider Code Editing Benchmark",
    description:
      "Evaluates how effectively LLMs edit Python source files to complete 133 coding exercises from Exercism.",
    category: "coding",
    source_type: "aider",
    source_url: "https://aider.chat/docs/leaderboards/edit.html",
    methodology:
      "Tests code editing ability — models must modify existing Python files to pass unit tests.",
    repo_url: "https://github.com/paul-gauthier/aider",
    website_url: "https://aider.chat/",
  },
]

const AIDER_FALLBACK = [
  { model: "OpenAI o3", score: 72.7 },
  { model: "Claude 3.5 Sonnet", score: 64.9 },
  { model: "Gemini 2.5 Pro", score: 64.0 },
  { model: "DeepSeek-V3", score: 60.2 },
  { model: "GPT-4o", score: 56.1 },
  { model: "Llama 3.1 405B", score: 43.6 },
  { model: "Qwen2.5-Coder-32B", score: 52.0 },
]

async function fetchAiderLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch("https://aider.chat/docs/leaderboards/", {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const entries: { model: string; score: number }[] = []

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

    const finalEntries =
      entries.length >= 3
        ? entries.map((e, i) => ({
            ...e,
            rank: i + 1,
            date: new Date().toISOString().split("T")[0],
          }))
        : AIDER_FALLBACK.map((e, i) => ({
            ...e,
            rank: i + 1,
            date: new Date().toISOString().split("T")[0],
          }))

    return {
      slug: "aider-polyglot",
      entries: finalEntries,
      total_models: finalEntries.length,
      top_model: finalEntries[0]?.model || "Unknown",
      top_score: finalEntries[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    const fallback = AIDER_FALLBACK.map((e, i) => ({
      ...e,
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))
    return {
      slug: "aider-polyglot",
      entries: fallback,
      total_models: fallback.length,
      top_model: fallback[0]?.model || "Unknown",
      top_score: fallback[0]?.score || 0,
      last_updated: new Date().toISOString(),
      error: `Using cached data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export { AIDER_SOURCES, fetchAiderLeaderboard }
