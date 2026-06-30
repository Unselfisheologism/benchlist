/**
 * LMSYS Chatbot Arena (Arena AI) leaderboard fetcher
 * Source: https://openlm.ai/chatbot-arena/
 */
import type { BenchmarkSource, FetchResult } from "../types"

const LMSYS_SOURCES: BenchmarkSource[] = [
  {
    slug: "chatbot-arena",
    name: "Chatbot Arena (LMSYS)",
    description:
      "Crowdsourced, randomized battle platform for LLMs based on anonymous human preference voting. Elo rating system.",
    category: "leaderboard",
    source_type: "lmsys",
    source_url: "https://openlm.ai/chatbot-arena/",
    methodology:
      "Users chat with two anonymous models side-by-side and vote for the better response. Elo ratings calculated from millions of votes.",
    paper_url: "https://arxiv.org/abs/2403.04132",
    repo_url: "https://github.com/lm-sys/FastChat",
    website_url: "https://openlm.ai/chatbot-arena/",
  },
  {
    slug: "chatbot-arena-coding",
    name: "Chatbot Arena — Coding",
    description:
      "Coding-specific subset of Chatbot Arena. Measures human preference for code generation and debugging.",
    category: "coding",
    source_type: "lmsys",
    source_url: "https://openlm.ai/chatbot-arena/",
    methodology: "Same as Chatbot Arena but filtered to coding-related conversations only.",
    website_url: "https://openlm.ai/chatbot-arena/",
  },
]

async function fetchLmsysLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    // Try the community JSON snapshot first
    const ghRes = await fetch(
      "https://raw.githubusercontent.com/oolong-tea-2026/arena-ai-leaderboards/main/data/overall.json",
      {
        signal: controller.signal,
        headers: { "User-Agent": "Benchlist/1.0 (benchmark-directory-bot)" },
      },
    )
    clearTimeout(timeout)

    if (ghRes.ok) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const data = (await ghRes.json()) as any
      if (data.leaderboard && Array.isArray(data.leaderboard)) {
        const entries = data.leaderboard.map((e: any) => ({
          model: e.model,
          score: e.score,
          rank: e.rank,
          date: new Date().toISOString().split("T")[0],
        }))
        return {
          slug: "chatbot-arena",
          entries,
          total_models: entries.length,
          top_model: entries[0]?.model || "Unknown",
          top_score: entries[0]?.score || 0,
          last_updated: new Date().toISOString(),
        }
      }
    }

    // Fallback: scrape HTML
    const fallbackRes = await fetch("https://openlm.ai/chatbot-arena/", {
      headers: { "User-Agent": "Benchlist/1.0 (benchmark-directory-bot)" },
    })

    if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`)

    const html = await fallbackRes.text()
    const entries: { model: string; score: number }[] = []

    const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi
    let match
    while ((match = rowRegex.exec(html)) !== null) {
      const model = match[1].replace(/<[^>]+>/g, "").trim()
      const scoreStr = match[2].replace(/<[^>]+>/g, "").trim()
      const score = parseFloat(scoreStr)
      if (model && !isNaN(score) && score > 100) {
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
      slug: "chatbot-arena",
      entries: ranked,
      total_models: ranked.length,
      top_model: ranked[0]?.model || "Unknown",
      top_score: ranked[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    return {
      slug: "chatbot-arena",
      entries: [],
      total_models: 0,
      top_model: "",
      top_score: 0,
      last_updated: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { LMSYS_SOURCES, fetchLmsysLeaderboard }
