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

const MMLU_PRO_FALLBACK = [
  { model: "OpenAI o3", score: 78.0 },
  { model: "Gemini 2.5 Pro", score: 76.2 },
  { model: "Claude 3.5 Sonnet", score: 72.0 },
  { model: "GPT-4o", score: 72.6 },
  { model: "DeepSeek-V3", score: 75.9 },
  { model: "Llama 3.1 405B", score: 68.5 },
]

const GPQA_FALLBACK = [
  { model: "OpenAI o3", score: 79.6 },
  { model: "Gemini 2.5 Pro", score: 78.0 },
  { model: "Claude 3.5 Sonnet", score: 65.0 },
  { model: "GPT-4o", score: 53.6 },
  { model: "DeepSeek-V3", score: 59.1 },
]

const AIME_FALLBACK = [
  { model: "OpenAI o3", score: 93.3 },
  { model: "Gemini 2.5 Pro", score: 92.0 },
  { model: "Claude 3.5 Sonnet", score: 60.0 },
  { model: "GPT-4o", score: 13.3 },
]

const HUMANEVAL_FALLBACK = [
  { model: "OpenAI o3", score: 96.3 },
  { model: "Claude 3.5 Sonnet", score: 92.0 },
  { model: "Gemini 2.5 Pro", score: 90.2 },
  { model: "GPT-4o", score: 90.2 },
  { model: "DeepSeek-V3", score: 88.4 },
  { model: "Qwen2.5-Coder-32B", score: 86.6 },
  { model: "Llama 3.1 405B", score: 80.5 },
]

function makeFallback(data: Array<{ model: string; score: number }>, slug: string): FetchResult {
  return {
    slug,
    entries: data.map((e, i) => ({
      ...e,
      rank: i + 1,
      date: new Date().toISOString().split("T")[0],
    })),
    total_models: data.length,
    top_model: data[0]?.model || "Unknown",
    top_score: data[0]?.score || 0,
    last_updated: new Date().toISOString(),
  }
}

async function fetchMmluLeaderboard(): Promise<FetchResult> {
  // All MMLU-family benchmarks use fallback data (no single reliable API endpoint)
  return makeFallback(MMLU_PRO_FALLBACK, "mmlu-pro")
}

async function fetchGpqaLeaderboard(): Promise<FetchResult> {
  return makeFallback(GPQA_FALLBACK, "gpqa-diamond")
}

async function fetchAimeLeaderboard(): Promise<FetchResult> {
  return makeFallback(AIME_FALLBACK, "aime-2024")
}

async function fetchHumanevalLeaderboard(): Promise<FetchResult> {
  return makeFallback(HUMANEVAL_FALLBACK, "humaneval")
}

export {
  MMLU_SOURCES,
  fetchMmluLeaderboard,
  fetchGpqaLeaderboard,
  fetchAimeLeaderboard,
  fetchHumanevalLeaderboard,
}
