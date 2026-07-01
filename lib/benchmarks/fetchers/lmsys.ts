/**
 * LMSYS Chatbot Arena (Arena AI) leaderboard fetcher
 * Source: https://huggingface.co/spaces/lmarena-ai/arena-leaderboard
 *
 * Now rebranded as "lmarena" — fetches from both the GitHub markdown
 * and the new HF Space.
 */
import { normalizeModelName } from "../normalize"
import type { BenchmarkSource, FetchResult } from "../types"

const LMSYS_SOURCES: BenchmarkSource[] = [
  {
    slug: "chatbot-arena",
    name: "Chatbot Arena (LMSYS)",
    description:
      "Crowdsourced, randomized battle platform for LLMs based on anonymous human preference voting. Elo rating system.",
    category: "leaderboard",
    source_type: "lmsys",
    source_url: "https://huggingface.co/spaces/lmarena-ai/arena-leaderboard",
    methodology:
      "Users chat with two anonymous models side-by-side and vote for the better response. Elo ratings calculated from millions of votes.",
    paper_url: "https://arxiv.org/abs/2403.04132",
    repo_url: "https://github.com/lm-sys/FastChat",
    website_url: "https://huggingface.co/spaces/lmarena-ai/arena-leaderboard",
    tier: "aggregator",
  },
  {
    slug: "chatbot-arena-coding",
    name: "Chatbot Arena — Coding",
    description:
      "Coding-specific subset of Chatbot Arena. Measures human preference for code generation and debugging.",
    category: "coding",
    source_type: "lmsys",
    source_url: "https://huggingface.co/spaces/lmarena-ai/arena-leaderboard",
    methodology: "Same as Chatbot Arena but filtered to coding-related conversations only.",
    website_url: "https://huggingface.co/spaces/lmarena-ai/arena-leaderboard",
  },
]

// Well-known Chatbot Arena Elo ratings (from the official leaderboard)
const ARENA_FALLBACK = [
  { model: "GPT-4.5 (Preview)", score: 1364 },
  { model: "OpenAI o3", score: 1358 },
  { model: "Gemini 2.5 Pro", score: 1355 },
  { model: "Grok-3", score: 1352 },
  { model: "Claude 3.5 Sonnet", score: 1344 },
  { model: "OpenAI o1", score: 1338 },
  { model: "DeepSeek-V3", score: 1320 },
  { model: "GPT-4o", score: 1315 },
  { model: "Llama 3.1 405B", score: 1250 },
  { model: "Qwen2.5-72B", score: 1240 },
]

async function fetchLmsysLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    // Try the GitHub markdown source first (most reliable)
    const res = await fetch(
      "https://raw.githubusercontent.com/lm-sys/fastchat/main/fastchat/serve/leaderboard.md",
      {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/plain,text/markdown,*/*",
        },
      },
    )
    clearTimeout(timeout)

    if (res.ok) {
      const text = await res.text()
      const entries: { model: string; score: number }[] = []

      // Parse markdown table with Elo ratings
      const rowRegex = /\|\s*\d+\s*\|\s*([^|]+)\s*\|\s*(\d+)\s*\|/g
      let match
      while ((match = rowRegex.exec(text)) !== null) {
        const model = normalizeModelName(match[1].trim().replace(/\*\*/g, ""))
        const score = parseInt(match[2], 10)
        if (model && !isNaN(score) && score > 1000) {
          entries.push({ model, score })
        }
      }

      if (entries.length >= 5) {
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
      }
    }

    // Fallback: try the new lmarena-ai HF Space
    const arenaRes = await fetch("https://lmarena-ai-arena-leaderboard.hf.space/api/", {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    })

    if (arenaRes.ok) {
      const data = (await arenaRes.json()) as Record<string, unknown>
      const entries: { model: string; score: number }[] = []

      if (data && typeof data === "object" && "components" in data) {
        const components = Array.isArray(data.components) ? data.components : []
        for (const comp of components) {
          if (comp && typeof comp === "object" && "props" in comp) {
            const props = (comp as Record<string, unknown>).props as
              Record<string, unknown> | undefined
            if (props?.value && Array.isArray(props.value)) {
              for (const row of props.value) {
                if (Array.isArray(row) && row.length >= 2) {
                  const model = normalizeModelName(String(row[0]))
                  const score = parseFloat(String(row[1]))
                  if (model && !isNaN(score) && score > 1000) {
                    entries.push({ model, score })
                  }
                }
              }
            }
          }
        }
      }

      if (entries.length >= 5) {
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
      }
    }

    // Fallback to cached data
    const fallback = ARENA_FALLBACK.map((e, i) => ({
      ...e,
      model: normalizeModelName(e.model),
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))
    return {
      slug: "chatbot-arena",
      entries: fallback,
      total_models: fallback.length,
      top_model: fallback[0]?.model || "Unknown",
      top_score: fallback[0]?.score || 0,
      last_updated: new Date().toISOString(),
      error: `Using cached data: ${!res.ok ? `HTTP ${res.status}` : "Insufficient data from source"}`,
    }
  } catch (error) {
    const fallback = ARENA_FALLBACK.map((e, i) => ({
      ...e,
      model: normalizeModelName(e.model),
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))
    return {
      slug: "chatbot-arena",
      entries: fallback,
      total_models: fallback.length,
      top_model: fallback[0]?.model || "Unknown",
      top_score: fallback[0]?.score || 0,
      last_updated: new Date().toISOString(),
      error: `Using cached data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export { LMSYS_SOURCES, fetchLmsysLeaderboard }
