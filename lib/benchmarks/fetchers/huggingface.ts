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

async function fetchHuggingFaceLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    // Fetch the Open LLM Leaderboard README which contains results
    const res = await fetch(
      "https://huggingface.co/api/datasets/open-llm-leaderboard/contents/resolve/main/README.md",
      {
        signal: controller.signal,
        headers: { "User-Agent": "Benchlist/1.0 (benchmark-directory-bot)" },
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

    const ranked = entries.map((e, i) => ({
      ...e,
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    }))

    return {
      slug: "open-llm-leaderboard",
      entries: ranked,
      total_models: ranked.length,
      top_model: ranked[0]?.model || "Unknown",
      top_score: ranked[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    return {
      slug: "open-llm-leaderboard",
      entries: [],
      total_models: 0,
      top_model: "",
      top_score: 0,
      last_updated: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { HUGGINGFACE_SOURCES, fetchHuggingFaceLeaderboard }
