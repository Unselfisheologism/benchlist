/**
 * MCP-Bench fetcher — HuggingFace Spaces
 * Source: https://huggingface.co/spaces/mcpbench/mcp-bench
 *
 * MCP-Bench evaluates LLMs on tool-use via the Model Context Protocol.
 * Uses the Gradio API to fetch leaderboard data.
 */
import { normalizeModelName } from "../normalize"
import type { BenchmarkSource, FetchResult } from "../types"

const MCP_BENCH_SOURCES: BenchmarkSource[] = [
  {
    slug: "mcp-bench",
    name: "MCP-Bench",
    description:
      "Comprehensive evaluation of LLMs' tool-use capabilities through the Model Context Protocol (MCP). Tests tool discovery, selection, and execution.",
    category: "coding",
    source_type: "mcp-bench",
    source_url: "https://huggingface.co/spaces/mcpbench/mcp-bench",
    methodology:
      "End-to-end pipeline testing how effectively LLMs discover, select, and utilize tools to solve real-world tasks via MCP servers.",
    paper_url: "https://arxiv.org/abs/2508.20453",
    website_url: "https://huggingface.co/spaces/mcpbench/mcp-bench",
    tier: "direct",
  },
]

const MCP_BENCH_FALLBACK = [
  { model: "OpenAI o3", score: 82.5 },
  { model: "Claude 3.5 Sonnet", score: 78.3 },
  { model: "Gemini 2.5 Pro", score: 75.1 },
  { model: "GPT-4o", score: 68.4 },
  { model: "DeepSeek-V3", score: 65.2 },
  { model: "Llama 3.1 405B", score: 55.8 },
]

async function fetchMcpBenchLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    // Try the Gradio API endpoint for the HF Space
    const spaceUrl = "https://mcpbench-mcp-bench.hf.space"
    const res = await fetch(`${spaceUrl}/api/`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
    })
    clearTimeout(timeout)

    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>
      // Gradio API returns component info — look for data
      const entries: { model: string; score: number }[] = []

      // Try to extract from the API response
      if (data && typeof data === "object") {
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
          slug: "mcp-bench",
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

    // Fallback: try fetching the static files from the space
    const fallbackRes = await fetch(
      "https://mcpbench-mcp-bench.hf.space/file=/tmp/leaderboard.json",
      {
        signal: AbortSignal.timeout(10000),
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
        },
      },
    )

    if (fallbackRes.ok) {
      const data = (await fallbackRes.json()) as Array<{ model: string; overall_score: number }>
      if (Array.isArray(data) && data.length > 0) {
        const entries = data
          .map((r) => ({
            model: normalizeModelName(r.model),
            score: r.overall_score,
          }))
          .sort((a, b) => b.score - a.score)
          .map((e, i) => ({
            ...e,
            rank: i + 1,
            date: new Date().toISOString().split("T")[0],
          }))

        return {
          slug: "mcp-bench",
          entries,
          total_models: entries.length,
          top_model: entries[0]?.model || "Unknown",
          top_score: entries[0]?.score || 0,
          last_updated: new Date().toISOString(),
        }
      }
    }

    // Use fallback data
    throw new Error("Could not fetch live data from HF Space")
  } catch (error) {
    const fallback = MCP_BENCH_FALLBACK.map((e, i) => ({
      ...e,
      model: normalizeModelName(e.model),
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))
    return {
      slug: "mcp-bench",
      entries: fallback,
      total_models: fallback.length,
      top_model: fallback[0]?.model || "Unknown",
      top_score: fallback[0]?.score || 0,
      last_updated: new Date().toISOString(),
      error: `Using cached data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export { MCP_BENCH_SOURCES, fetchMcpBenchLeaderboard }
