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

async function fetchAiderLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch("https://aider.chat/docs/leaderboards/", {
      signal: controller.signal,
      headers: { "User-Agent": "Benchlist/1.0 (benchmark-directory-bot)" },
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

    const ranked = entries.map((e, i) => ({
      ...e,
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))

    return {
      slug: "aider-polyglot",
      entries: ranked,
      total_models: ranked.length,
      top_model: ranked[0]?.model || "Unknown",
      top_score: ranked[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    return {
      slug: "aider-polyglot",
      entries: [],
      total_models: 0,
      top_model: "",
      top_score: 0,
      last_updated: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { AIDER_SOURCES, fetchAiderLeaderboard }
