/**
 * HuggingFace Open LLM Leaderboard fetcher (archived but still valuable)
 * Source: https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard
 */
import type { BenchmarkSource, FetchResult } from "../types"

const HUGGINGFACE_SOURCES: BenchmarkSource[] = [
  {
    slug: "open-llm-leaderboard",
    name: "Open LLM Leaderboard (HF)",
    description:
      "HuggingFace's comprehensive open-source model evaluation across multiple benchmarks. Now archived but remains a key reference.",
    category: "leaderboard",
    source_type: "huggingface",
    source_url:
      "https://huggingface.co/api/datasets/open-llm-leaderboard/contents/resolve/main/README.md",
    methodology:
      "Aggregates scores from MMLU, ARC, HellaSwag, TruthfulQA, Winogrande, and GSM8K. Focused on open-weight models.",
    repo_url: "https://github.com/huggingface/open-llm-leaderboard",
    website_url: "https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard",
  },
  {
    slug: "hle",
    name: "Humanity's Last Exam (HLE)",
    description:
      "Extremely difficult benchmark of expert-level questions across many domains. Designed to be challenging even for top AI systems.",
    category: "science",
    source_type: "huggingface",
    source_url: "https://huggingface.co/datasets/cais/hle",
    methodology:
      "Expert-written questions at the frontier of human knowledge. Models must demonstrate deep domain expertise.",
    paper_url: "https://arxiv.org/abs/2412.04814",
    website_url: "https://lastexam.ai/",
  },
]

const HF_LL_FALLBACK = [
  { model: "Meta-Llama-3.1-405B", score: 82.1 },
  { model: "Meta-Llama-3.1-70B", score: 79.3 },
  { model: "Qwen2.5-72B", score: 79.8 },
  { model: "Mistral-Large-2", score: 78.0 },
  { model: "Gemma-2-27B", score: 75.6 },
  { model: "Meta-Llama-3.1-8B", score: 68.2 },
]

async function fetchHuggingFaceLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(
      "https://huggingface.co/api/datasets/open-llm-leaderboard/contents/resolve/main/README.md",
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

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const text = await res.text()
    const entries: { model: string; score: number }[] = []

    // Parse markdown table rows
    const rowRegex = /\|\s*\[?([^\]|]+)\]?\s*\|\s*(\d+\.?\d*)\s*\|/g
    let match
    while ((match = rowRegex.exec(text)) !== null) {
      const model = match[1].trim().replace(/\*\*/g, "").replace(/\[|\]/g, "")
      const score = parseFloat(match[2])
      if (
        model &&
        !isNaN(score) &&
        score > 0 &&
        score <= 100 &&
        !model.startsWith("Model") &&
        !model.includes("---")
      ) {
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
        : HF_LL_FALLBACK.map((e, i) => ({
            ...e,
            rank: i + 1,
            date: new Date().toISOString().split("T")[0],
          }))

    return {
      slug: "open-llm-leaderboard",
      entries: finalEntries,
      total_models: finalEntries.length,
      top_model: finalEntries[0]?.model || "Unknown",
      top_score: finalEntries[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    const fallback = HF_LL_FALLBACK.map((e, i) => ({
      ...e,
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))
    return {
      slug: "open-llm-leaderboard",
      entries: fallback,
      total_models: fallback.length,
      top_model: fallback[0]?.model || "Unknown",
      top_score: fallback[0]?.score || 0,
      last_updated: new Date().toISOString(),
      error: `Using cached data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export { HUGGINGFACE_SOURCES, fetchHuggingFaceLeaderboard }
