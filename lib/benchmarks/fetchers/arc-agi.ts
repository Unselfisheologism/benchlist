/**
 * ARC-AGI benchmark fetcher
 * Source: https://arcprize.org/
 */
import type { BenchmarkSource, FetchResult } from "../types"

const ARC_AGI_SOURCES: BenchmarkSource[] = [
  {
    slug: "arc-agi-pub",
    name: "ARC-AGI Public",
    description:
      "Measures fluid intelligence — the ability to solve novel reasoning problems without prior knowledge.",
    category: "reasoning",
    source_type: "arc-agi",
    source_url: "https://arcprize.org/leaderboard",
    methodology:
      "Tasks are visual pattern puzzles requiring abstract reasoning. Models must infer the transformation rule from input-output examples.",
    paper_url: "https://arxiv.org/abs/2411.04383",
    repo_url: "https://github.com/fchollet/ARC-AGI",
    website_url: "https://arcprize.org/",
  },
  {
    slug: "arc-agi-3",
    name: "ARC-AGI-3",
    description:
      "Interactive reasoning benchmark for AI agents — learn in novel turn-based environments.",
    category: "reasoning",
    source_type: "arc-agi",
    source_url: "https://arcprize.org/leaderboard",
    methodology:
      "Interactive environments where agents must learn rules through exploration and apply them to new challenges.",
    paper_url: "https://arcprize.org/media/ARC_AGI_3_Technical_Report.pdf",
    repo_url: "https://github.com/arcprize/ARC-AGI-3",
    website_url: "https://arcprize.org/",
  },
]

async function fetchArcAgiLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch("https://arcprize.org/leaderboard", {
      signal: controller.signal,
      headers: { "User-Agent": "Benchlist/1.0 (benchmark-directory-bot)" },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()
    const entries: { model: string; score: number }[] = []

    // Parse leaderboard entries
    const scoreRegex = /(?:model|name|system)[^<]*<[^>]*>([^<]+)<[\s\S]*?(\d+\.?\d*)\s*%/gi
    let match
    while ((match = scoreRegex.exec(html)) !== null) {
      const model = match[1].trim()
      const score = parseFloat(match[2])
      if (model && !isNaN(score) && score > 0 && score <= 100) {
        entries.push({ model, score })
      }
    }

    // Fallback: table-based parsing
    if (entries.length === 0) {
      const tableRegex =
        /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi
      while ((match = tableRegex.exec(html)) !== null) {
        const model = match[1].replace(/<[^>]+>/g, "").trim()
        const scoreStr = match[2].replace(/<[^>]+>/g, "").trim()
        const score = parseFloat(scoreStr)
        if (model && !isNaN(score) && score > 0 && score <= 100) {
          entries.push({ model, score })
        }
      }
    }

    entries.sort((a, b) => b.score - a.score)

    const ranked = entries.map((e, i) => ({
      ...e,
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))

    return {
      slug: "arc-agi-pub",
      entries: ranked,
      total_models: ranked.length,
      top_model: ranked[0]?.model || "Unknown",
      top_score: ranked[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    return {
      slug: "arc-agi-pub",
      entries: [],
      total_models: 0,
      top_model: "",
      top_score: 0,
      last_updated: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { ARC_AGI_SOURCES, fetchArcAgiLeaderboard }
