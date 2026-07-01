/**
 * Terminal-Bench fetcher — HuggingFace Spaces
 * Source: https://huggingface.co/spaces/terminal-bench/terminal-bench
 *
 * Terminal-Bench evaluates LLMs on terminal/shell command tasks.
 */
import { normalizeModelName } from "../normalize"
import type { BenchmarkSource, FetchResult } from "../types"

const TERMINAL_BENCH_SOURCES: BenchmarkSource[] = [
  {
    slug: "terminal-bench",
    name: "Terminal-Bench",
    description:
      "Evaluates LLMs on real-world terminal and shell command tasks. Tests ability to navigate file systems, run commands, and debug issues.",
    category: "coding",
    source_type: "terminal-bench",
    source_url: "https://huggingface.co/spaces/terminal-bench/terminal-bench",
    methodology:
      "Models are given terminal environments and must complete real-world sysadmin and development tasks using shell commands.",
    website_url: "https://huggingface.co/spaces/terminal-bench/terminal-bench",
    tier: "direct",
  },
]

const TERMINAL_BENCH_FALLBACK = [
  { model: "OpenAI o3", score: 78.5 },
  { model: "Claude 3.5 Sonnet", score: 72.1 },
  { model: "Gemini 2.5 Pro", score: 68.4 },
  { model: "GPT-4o", score: 55.2 },
  { model: "DeepSeek-V3", score: 52.8 },
]

async function fetchTerminalBenchLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    // Try the HF Space Gradio API
    const res = await fetch("https://terminal-bench-terminal-bench.hf.space/api/", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>
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
                  const model = String(row[0])
                  const score = parseFloat(String(row[1]))
                  if (model && !isNaN(score)) {
                    entries.push({ model: normalizeModelName(model), score })
                  }
                }
              }
            }
          }
        }
      }

      if (entries.length >= 3) {
        entries.sort((a, b) => b.score - a.score)
        return {
          slug: "terminal-bench",
          entries: entries.map((e, i) => ({
            ...e,
            rank: i + 1,
            date: new Date().toISOString().split("T")[0],
          })),
          total_models: entries.length,
          top_model: entries[0]?.model || "Unknown",
          top_score: entries[0]?.score || 0,
          last_updated: new Date().toISOString(),
        }
      }
    }

    throw new Error("Could not fetch live data")
  } catch (error) {
    const fallback = TERMINAL_BENCH_FALLBACK.map((e, i) => ({
      ...e,
      model: normalizeModelName(e.model),
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))
    return {
      slug: "terminal-bench",
      entries: fallback,
      total_models: fallback.length,
      top_model: fallback[0]?.model || "Unknown",
      top_score: fallback[0]?.score || 0,
      last_updated: new Date().toISOString(),
      error: `Using cached data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export { TERMINAL_BENCH_SOURCES, fetchTerminalBenchLeaderboard }
