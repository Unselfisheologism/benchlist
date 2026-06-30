import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getAllBenchmarks, getBenchmarksByCategory } from "@/app/actions/benchmarks"
import { getTopCategories } from "@/app/actions/projects"

export const metadata = {
  title: "AI Benchmarks - Benchlist",
  description:
    "Compare AI model performance across SWE-bench, ARC-AGI, Chatbot Arena, MMLU, HumanEval, and more. Auto-updated from official sources.",
}

const CATEGORY_LABELS: Record<string, string> = {
  coding: "Coding & Software Engineering",
  reasoning: "Reasoning & Logic",
  science: "Science & Knowledge",
  math: "Mathematics",
  leaderboard: "Leaderboards & Aggregates",
  nlp: "Natural Language Processing",
  general: "General",
}

function formatScore(score: number | null, sourceType: string): string {
  if (score === null) return "—"
  // Elo ratings (LMSYS) are > 1000
  if (sourceType === "lmsys") return score.toFixed(0)
  // Percentage scores
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
  const [benchmarks, topCategories] = await Promise.all([getAllBenchmarks(), getTopCategories(5)])

  // Group by category
  const grouped = await getBenchmarksByCategory()
  const categoryOrder = ["coding", "reasoning", "math", "science", "leaderboard", "nlp", "general"]

  return (
    <main className="bg-secondary/20 min-h-screen">
      <div className="container mx-auto max-w-6xl px-4 pt-8 pb-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:items-start">
          {/* Main content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="px-3 text-2xl font-bold sm:px-4 sm:text-3xl">AI Benchmarks</h1>
              <p className="text-muted-foreground px-3 text-sm sm:px-4">
                Compare AI model performance across {benchmarks.length} benchmarks. Data
                auto-updated from official sources.
              </p>
            </div>

            {/* Stats row */}
            <div className="dark:bg-secondary/10 mx-3 rounded-lg border border-zinc-100 bg-white p-4 shadow-sm sm:mx-4 dark:border-zinc-800/50">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <span className="text-foreground font-bold">{benchmarks.length}</span>{" "}
                  <span className="text-muted-foreground">benchmarks</span>
                </div>
                <div className="bg-border h-4 w-px" />
                <div>
                  <span className="text-foreground font-bold">
                    {benchmarks.filter((b) => b.total_models > 0).length}
                  </span>{" "}
                  <span className="text-muted-foreground">with live data</span>
                </div>
                <div className="bg-border h-4 w-px" />
                <div>
                  <span className="text-foreground font-bold">Auto-updated</span>{" "}
                  <span className="text-muted-foreground">every 24h</span>
                </div>
              </div>
            </div>

            {/* Benchmark categories */}
            {categoryOrder.map((cat) => {
              const items = grouped[cat]
              if (!items || items.length === 0) return null

              return (
                <div key={cat} className="space-y-3">
                  <h2 className="px-3 text-lg font-semibold sm:px-4">
                    {CATEGORY_LABELS[cat] || cat}
                  </h2>
                  <div className="space-y-3">
                    {items.map((bench) => (
                      <div
                        key={bench.slug}
                        className="dark:bg-secondary/10 mx-3 rounded-lg border border-zinc-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:mx-4 dark:border-zinc-800/50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <h3 className="text-foreground font-medium">{bench.name}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {bench.source_type}
                              </Badge>
                              {bench.fetch_status === "success" && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  Live
                                </Badge>
                              )}
                              {bench.fetch_status === "error" && (
                                <Badge variant="destructive" className="text-xs">
                                  Error
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground mb-2 line-clamp-2 text-sm">
                              {bench.description}
                            </p>

                            {/* Top results */}
                            {bench.leaderboard_data.length > 0 && (
                              <div className="mt-3 space-y-1">
                                {bench.leaderboard_data.slice(0, 3).map((entry, i) => (
                                  <div
                                    key={`${bench.slug}-${i}`}
                                    className="flex items-center gap-3 text-sm"
                                  >
                                    <span className="text-muted-foreground w-5 text-right text-xs font-medium">
                                      #{entry.rank || i + 1}
                                    </span>
                                    <span className="text-foreground flex-1 truncate font-medium">
                                      {entry.model}
                                    </span>
                                    <span className="text-muted-foreground font-mono text-xs">
                                      {formatScore(entry.score, bench.source_type)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {bench.leaderboard_data.length === 0 && (
                              <div className="text-muted-foreground mt-2 text-xs">
                                {bench.fetch_status === "pending"
                                  ? "Awaiting first data fetch…"
                                  : bench.fetch_status === "error"
                                    ? `Fetch error: ${bench.fetch_error || "unknown"}`
                                    : "No data available"}
                              </div>
                            )}

                            {/* Meta row */}
                            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-3 text-xs">
                              {bench.top_model && bench.top_score !== null && (
                                <span>
                                  🏆 <strong>{bench.top_model}</strong>{" "}
                                  {formatScore(bench.top_score, bench.source_type)}
                                </span>
                              )}
                              {bench.total_models > 0 && <span>{bench.total_models} models</span>}
                              <span>Updated {timeAgo(bench.last_fetched_at)}</span>
                            </div>
                          </div>

                          {/* Links */}
                          <div className="flex flex-shrink-0 flex-col gap-1">
                            {bench.website_url && (
                              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                                <Link href={bench.website_url} target="_blank" rel="noopener">
                                  Website →
                                </Link>
                              </Button>
                            )}
                            {bench.paper_url && (
                              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                                <Link href={bench.paper_url} target="_blank" rel="noopener">
                                  Paper →
                                </Link>
                              </Button>
                            )}
                            {bench.repo_url && (
                              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                                <Link href={bench.repo_url} target="_blank" rel="noopener">
                                  Repo →
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className="top-24 space-y-6">
            {/* About */}
            <div className="space-y-3">
              <h3 className="font-semibold">About AI Benchmarks</h3>
              <div className="dark:bg-secondary/10 rounded-md border border-zinc-100 bg-white p-4 text-sm shadow-sm dark:border-zinc-800/50">
                <p className="text-muted-foreground">
                  Benchlist tracks {benchmarks.length} public AI benchmarks. Leaderboard data is
                  automatically fetched from official sources every 24 hours.
                </p>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Categories</h3>
                <Button variant="ghost" size="sm" className="text-sm" asChild>
                  <Link href="/categories">View all</Link>
                </Button>
              </div>
              <div className="space-y-1">
                {topCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories?category=${category.id}`}
                    className="hover:bg-muted/40 -mx-2 flex items-center justify-between rounded-md p-2 text-sm transition-colors"
                  >
                    <span>{category.name}</span>
                    <span className="text-muted-foreground bg-secondary rounded-full px-2 py-0.5 text-xs">
                      {category.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Access */}
            <div className="space-y-3">
              <h3 className="font-semibold">Quick Access</h3>
              <div className="space-y-1">
                <Link
                  href="/trending"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 text-sm transition-colors hover:underline"
                >
                  Trending Benchmarks
                </Link>
                <Link
                  href="/projects/submit"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 text-sm transition-colors hover:underline"
                >
                  Submit a Benchmark
                </Link>
              </div>
            </div>

            {/* Sources */}
            <div className="space-y-3">
              <h3 className="font-semibold">Data Sources</h3>
              <div className="space-y-1 text-sm">
                <Link
                  href="https://www.swebench.com/"
                  target="_blank"
                  rel="noopener"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 transition-colors hover:underline"
                >
                  SWE-bench
                </Link>
                <Link
                  href="https://arcprize.org/"
                  target="_blank"
                  rel="noopener"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 transition-colors hover:underline"
                >
                  ARC-AGI
                </Link>
                <Link
                  href="https://aider.chat/"
                  target="_blank"
                  rel="noopener"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 transition-colors hover:underline"
                >
                  Aider
                </Link>
                <Link
                  href="https://openlm.ai/chatbot-arena/"
                  target="_blank"
                  rel="noopener"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 transition-colors hover:underline"
                >
                  LMSYS Chatbot Arena
                </Link>
                <Link
                  href="https://livecodebench.github.io/"
                  target="_blank"
                  rel="noopener"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 transition-colors hover:underline"
                >
                  LiveCodeBench
                </Link>
                <Link
                  href="https://huggingface.co/"
                  target="_blank"
                  rel="noopener"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 transition-colors hover:underline"
                >
                  HuggingFace
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
