import { Suspense } from "react"

import {
  getAllBenchmarks,
  getBenchmarksByCategory,
  getBenchmarkStats,
  getCategoryList,
} from "@/app/actions/benchmarks"

import { BenchmarksClient } from "./benchmarks-client"

export const metadata = {
  title: "AI Benchmarks — Every Benchmark in Existence",
  description:
    "Comprehensive directory of 130+ AI, ML, and RL benchmarks from every public source: Chatbot Arena, SWE-bench, ARC-AGI, MMLU, HLE, and hundreds more.",
}

export const revalidate = 3600 // ISR: refresh catalog every hour

const CATEGORY_LABELS: Record<string, string> = {
  coding: "Coding & Software Engineering",
  reasoning: "Reasoning & Logic",
  science: "Science & Knowledge",
  math: "Mathematics",
  leaderboard: "Leaderboards & Aggregates",
  nlp: "Natural Language Processing",
  multimodal: "Multimodal & Vision-Language",
  safety: "Safety, Alignment & Ethics",
  agents: "Agents & Tool Use",
  retrieval: "Retrieval & RAG",
  rl: "Reinforcement Learning",
  vision: "Computer Vision",
  speech: "Speech & Audio",
  translation: "Translation",
  other: "Other Specialized",
  general: "General",
}

const CATEGORY_ICONS: Record<string, string> = {
  coding: "💻",
  reasoning: "🧠",
  science: "🔬",
  math: "📐",
  leaderboard: "🏆",
  nlp: "📝",
  multimodal: "🖼️",
  safety: "🛡️",
  agents: "🤖",
  retrieval: "🔍",
  rl: "🎮",
  vision: "👁️",
  speech: "🎙️",
  translation: "🌍",
  other: "📦",
  general: "⚡",
}

const CATEGORY_ORDER = [
  "leaderboard",
  "coding",
  "reasoning",
  "math",
  "science",
  "multimodal",
  "nlp",
  "agents",
  "safety",
  "retrieval",
  "rl",
  "vision",
  "speech",
  "translation",
  "other",
]

function formatScore(score: number | null, sourceType: string): string {
  if (score === null) return "—"
  if (sourceType === "lmsys") return score.toFixed(0)
  return `${score.toFixed(1)}%`
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  return `${days}d ago`
}

export default async function BenchmarksPage() {
  const [benchmarks, grouped, categories, stats] = await Promise.all([
    getAllBenchmarks(),
    getBenchmarksByCategory(),
    getCategoryList(),
    getBenchmarkStats(),
  ])

  const withData = benchmarks.filter((b) => b.leaderboard_data.length > 0)

  return (
    <main className="bg-secondary/20 min-h-screen">
      <div className="container mx-auto max-w-6xl px-4 pt-8 pb-12">
        {/* Header */}
        <div className="mb-8 space-y-3">
          <h1 className="px-0 text-3xl font-bold sm:text-4xl">AI Benchmarks</h1>
          <p className="text-muted-foreground px-0 text-base">
            Every AI, ML, and RL benchmark in existence — {stats.total} benchmarks across{" "}
            {stats.categories} categories from {stats.organizations} organizations. Data
            auto-updated from official sources.
          </p>
        </div>

        {/* Stats bar */}
        <div className="dark:bg-secondary/10 mb-8 rounded-lg border border-zinc-100 bg-white p-4 shadow-sm dark:border-zinc-800/50">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-foreground font-bold">{stats.total}</span>{" "}
              <span className="text-muted-foreground">benchmarks</span>
            </div>
            <div className="bg-border h-4 w-px" />
            <div>
              <span className="text-foreground font-bold">{withData.length}</span>{" "}
              <span className="text-muted-foreground">with live data</span>
            </div>
            <div className="bg-border h-4 w-px" />
            <div>
              <span className="text-foreground font-bold">{stats.categories}</span>{" "}
              <span className="text-muted-foreground">categories</span>
            </div>
            <div className="bg-border h-4 w-px" />
            <div>
              <span className="text-foreground font-bold">{stats.organizations}</span>{" "}
              <span className="text-muted-foreground">organizations</span>
            </div>
            <div className="bg-border h-4 w-px" />
            <div>
              <span className="font-bold text-green-600">●</span>{" "}
              <span className="text-muted-foreground">Auto-updated every 24h</span>
            </div>
          </div>
        </div>

        {/* Client-side search & filter controls */}
        <Suspense fallback={null}>
          <BenchmarksClient
            benchmarks={benchmarks}
            grouped={grouped}
            categories={categories}
            categoryLabels={CATEGORY_LABELS}
            categoryIcons={CATEGORY_ICONS}
            categoryOrder={CATEGORY_ORDER}
            formatScore={formatScore}
            timeAgo={timeAgo}
          />
        </Suspense>
      </div>
    </main>
  )
}
