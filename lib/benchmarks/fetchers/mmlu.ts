/**
 * MMLU / MMLU-Pro / GPQA / AIME / HumanEval fetcher
 * Sources: Various — aggregated from public leaderboards
 */
import type { BenchmarkSource, FetchResult } from "../types"

const MMLU_SOURCES: BenchmarkSource[] = [
  {
    slug: "mmlu-pro",
    name: "MMLU-Pro",
    description:
      "Updated version of MMLU with harder questions, 10 choices instead of 4, and reduced ambiguity. Tests knowledge across 57 subjects.",
    category: "science",
    source_type: "mmlu",
    source_url: "https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard",
    methodology:
      "Multiple-choice questions across STEM, humanities, social sciences, and more. 10 answer choices with harder, more reasoning-intensive questions.",
    paper_url: "https://arxiv.org/abs/2406.01574",
    website_url: "https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard",
  },
  {
    slug: "gpqa-diamond",
    name: "GPQA Diamond",
    description:
      "Graduate-level science questions in biology, chemistry, and physics. Expert-validated, adversarially filtered.",
    category: "science",
    source_type: "mmlu",
    source_url: "https://huggingface.co/datasets/Idavidrein/gpqa",
    methodology:
      "448 multiple-choice questions written by domain experts. Adversarially filtered so crowdworkers can't answer correctly.",
    paper_url: "https://arxiv.org/abs/2311.12022",
    website_url: "https://github.com/idavidrein/gpqa",
  },
  {
    slug: "aime-2024",
    name: "AIME 2024",
    description:
      "American Invitational Mathematics Examination problems. Tests advanced mathematical problem-solving.",
    category: "math",
    source_type: "mmlu",
    source_url: "https://huggingface.co/datasets/AIME-2024",
    methodology:
      "15 problems from the 2024 AIME competition. Free-response numeric answers requiring deep mathematical reasoning.",
    website_url: "https://www.maa.org/math-competitions",
  },
  {
    slug: "humaneval",
    name: "HumanEval",
    description:
      "164 hand-written Python programming problems with unit tests. The original code generation benchmark.",
    category: "coding",
    source_type: "mmlu",
    source_url: "https://huggingface.co/datasets/openai_humaneval",
    methodology:
      "Models generate Python functions from docstrings. Pass@k measures probability of generating a correct solution in k attempts.",
    paper_url: "https://arxiv.org/abs/2107.03374",
    repo_url: "https://github.com/openai/human-eval",
  },
]

async function fetchMmluLeaderboard(): Promise<FetchResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    // Try HuggingFace Open LLM Leaderboard dataset
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

    // Parse markdown table with model names and scores
    const rowRegex = /\|\s*([^|]+)\s*\|\s*(\d+\.?\d*)\s*\|/g
    let match
    while ((match = rowRegex.exec(text)) !== null) {
      const model = match[1].trim().replace(/\*\*/g, "")
      const score = parseFloat(match[2])
      if (
        model &&
        !isNaN(score) &&
        score > 0 &&
        score <= 100 &&
        !model.startsWith("Model") &&
        !model.startsWith("---")
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
      slug: "mmlu-pro",
      entries: ranked,
      total_models: ranked.length,
      top_model: ranked[0]?.model || "Unknown",
      top_score: ranked[0]?.score || 0,
      last_updated: new Date().toISOString(),
    }
  } catch (error) {
    return {
      slug: "mmlu-pro",
      entries: [],
      total_models: 0,
      top_model: "",
      top_score: 0,
      last_updated: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export { MMLU_SOURCES, fetchMmluLeaderboard }
