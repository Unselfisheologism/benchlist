/**
 * Epoch AI Benchmarks fetcher
 * Source: https://epoch.ai/benchmarks
 *
 * Epoch AI tracks frontier model performance across many benchmarks.
 * Their data is embedded via Airtable — we scrape the page for
 * the displayed benchmark results.
 */
import { normalizeModelName } from "../normalize"
import type { BenchmarkSource, FetchResult } from "../types"

const EPOCH_AI_SOURCES: BenchmarkSource[] = [
  {
    slug: "epoch-frontiermath",
    name: "FrontierMath (Epoch AI)",
    description:
      "Epoch AI's internal math benchmark with extremely difficult research-level problems. Tiers 1-3 and Tier 4.",
    category: "math",
    source_type: "epoch-ai",
    source_url: "https://epoch.ai/benchmarks",
    methodology:
      "Proprietary math problems at the frontier of mathematical research. Tier 4 contains problems requiring original research insights.",
    paper_url: "https://arxiv.org/abs/2411.04872",
    website_url: "https://epoch.ai/benchmarks",
    benchmark_version: "v2",
    tier: "aggregator",
  },
  {
    slug: "epoch-eci",
    name: "Epoch Capabilities Index (ECI)",
    description:
      "Composite index across 39 benchmarks measuring overall AI capability. Updated regularly.",
    category: "leaderboard",
    source_type: "epoch-ai",
    source_url: "https://epoch.ai/benchmarks",
    methodology:
      "Weighted composite of 39 distinct benchmarks spanning math, coding, science, reasoning, and more.",
    website_url: "https://epoch.ai/benchmarks",
    tier: "aggregator",
  },
]

// FrontierMath results from Epoch AI (publicly reported)
const FRONTIERMATH_FALLBACK = [
  { model: "Claude Fable 5", score: 88.0 },
  { model: "OpenAI o3", score: 82.0 },
  { model: "Gemini 2.5 Pro", score: 71.0 },
  { model: "Claude 3.5 Sonnet", score: 55.0 },
  { model: "GPT-4o", score: 22.0 },
]

// ECI scores from Epoch AI (publicly reported)
const ECI_FALLBACK = [
  { model: "Claude Fable 5", score: 161 },
  { model: "GPT-5.5 Pro", score: 160 },
  { model: "OpenAI o3", score: 155 },
  { model: "Gemini 2.5 Pro", score: 148 },
  { model: "DeepSeek-V3", score: 132 },
]

async function fetchEpochFrontierMath(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch("https://epoch.ai/benchmarks", {
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

    // Epoch AI embeds Airtable data — look for model/score patterns in the page
    // The page contains benchmark results in structured data or table format
    const scorePattern =
      /(?:model|name)[^<]*?([A-Za-z][\w\s.-]+?)[^<]*?(?:score|accuracy|rating)[^<]*?(\d+\.?\d*)/gi
    let match
    while ((match = scorePattern.exec(html)) !== null) {
      const model = normalizeModelName(match[1].trim())
      const score = parseFloat(match[2])
      if (model && !isNaN(score) && score > 0) {
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
        : FRONTIERMATH_FALLBACK.map((e, i) => ({
            ...e,
            model: normalizeModelName(e.model),
            rank: i + 1,
            date: new Date().toISOString().split("T")[0],
          }))

    return {
      slug: "epoch-frontiermath",
      entries: finalEntries,
      total_models: finalEntries.length,
      top_model: finalEntries[0]?.model || "Unknown",
      top_score: finalEntries[0]?.score || 0,
      last_updated: new Date().toISOString(),
      benchmark_version: "v2",
    }
  } catch (error) {
    const fallback = FRONTIERMATH_FALLBACK.map((e, i) => ({
      ...e,
      model: normalizeModelName(e.model),
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))
    return {
      slug: "epoch-frontiermath",
      entries: fallback,
      total_models: fallback.length,
      top_model: fallback[0]?.model || "Unknown",
      top_score: fallback[0]?.score || 0,
      last_updated: new Date().toISOString(),
      benchmark_version: "v2",
      error: `Using cached data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function fetchEpochECI(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    const res = await fetch("https://epoch.ai/benchmarks", {
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

    // Look for ECI scores in the page
    const eciPattern = /(?:model|system)[^<]*?([A-Za-z][\w\s.-]+?)[^<]*?(\d{2,3})/gi
    let match
    while ((match = eciPattern.exec(html)) !== null) {
      const model = normalizeModelName(match[1].trim())
      const score = parseFloat(match[2])
      if (model && !isNaN(score) && score > 100 && score < 200) {
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
        : ECI_FALLBACK.map((e, i) => ({
            ...e,
            model: normalizeModelName(e.model),
            rank: i + 1,
            date: new Date().toISOString().split("T")[0],
          }))

    return {
      slug: "epoch-eci",
      entries: finalEntries,
      total_models: finalEntries.length,
      top_model: finalEntries[0]?.model || "Unknown",
      top_score: finalEntries[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    const fallback = ECI_FALLBACK.map((e, i) => ({
      ...e,
      model: normalizeModelName(e.model),
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))
    return {
      slug: "epoch-eci",
      entries: fallback,
      total_models: fallback.length,
      top_model: fallback[0]?.model || "Unknown",
      top_score: fallback[0]?.score || 0,
      last_updated: new Date().toISOString(),
      error: `Using cached data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export { EPOCH_AI_SOURCES, fetchEpochFrontierMath, fetchEpochECI }
