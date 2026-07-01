"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { BenchmarkSummary } from "@/app/actions/benchmarks"

interface BenchmarksClientProps {
  benchmarks: BenchmarkSummary[]
  grouped: Record<string, BenchmarkSummary[]>
  categories: { category: string; count: number }[]
  categoryLabels: Record<string, string>
  categoryIcons: Record<string, string>
  categoryOrder: string[]
  formatScore: (score: number | null, sourceType: string) => string
  timeAgo: (dateStr: string | null) => string
}

/**
 * Client component for the benchmarks page.
 * Handles search, category filtering, and chart display.
 */
export function BenchmarksClient({
  benchmarks,
  categories,
  categoryLabels,
  categoryIcons,
  categoryOrder,
  formatScore,
  timeAgo,
}: BenchmarksClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [expandedChart, setExpandedChart] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = benchmarks

    if (activeCategory) {
      result = result.filter((b) => b.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          b.org?.toLowerCase().includes(q) ||
          b.tags?.some((t) => t.toLowerCase().includes(q)),
      )
    }

    return result
  }, [benchmarks, searchQuery, activeCategory])

  // Regroup filtered results by category
  const filteredGrouped = useMemo(() => {
    const g: Record<string, BenchmarkSummary[]> = {}
    for (const b of filtered) {
      const cat = b.category || "general"
      if (!g[cat]) g[cat] = []
      g[cat].push(b)
    }
    return g
  }, [filtered])

  // Count filtered by category for filter chips
  const filteredCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of filtered) {
      const cat = b.category || "general"
      counts[cat] = (counts[cat] || 0) + 1
    }
    return counts
  }, [filtered])

  // Determine which categories to render (respecting filter or default order)
  const visibleCategories = useMemo(() => {
    if (activeCategory) return [activeCategory]
    return categoryOrder.filter((cat) => filteredGrouped[cat]?.length)
  }, [activeCategory, filteredGrouped, categoryOrder])

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="sticky top-16 z-20">
        <div className="dark:bg-secondary/80 rounded-lg border border-zinc-100 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                🔍
              </span>
              <Input
                placeholder={`Search ${benchmarks.length} benchmarks...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            !activeCategory
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
          }`}
        >
          All ({benchmarks.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.category}
            onClick={() => setActiveCategory(activeCategory === cat.category ? null : cat.category)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat.category
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
            }`}
          >
            {categoryIcons[cat.category]} {categoryLabels[cat.category] || cat.category} (
            {filteredCategoryCounts[cat.category] || 0})
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-muted-foreground text-sm">
        {filtered.length === benchmarks.length
          ? `Showing all ${benchmarks.length} benchmarks`
          : `Showing ${filtered.length} of ${benchmarks.length} benchmarks`}
      </div>

      {/* Benchmark categories */}
      {visibleCategories.map((cat) => {
        const items = filteredGrouped[cat]
        if (!items || items.length === 0) return null

        return (
          <div key={cat} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {categoryIcons[cat]} {categoryLabels[cat] || cat}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                ({items.length})
              </span>
            </h2>
            <div className="space-y-3">
              {items.map((bench) => (
                <BenchmarkCard
                  key={bench.slug}
                  bench={bench}
                  formatScore={formatScore}
                  timeAgo={timeAgo}
                  expandedChart={expandedChart}
                  setExpandedChart={setExpandedChart}
                  categoryLabels={categoryLabels}
                />
              ))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-lg">No benchmarks match your search.</p>
          <p className="text-muted-foreground text-sm">
            Try a different query or clear the filter.
          </p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Individual Benchmark Card
// ═══════════════════════════════════════════════════════════════════════

function BenchmarkCard({
  bench,
  formatScore,
  timeAgo,
  expandedChart,
  setExpandedChart,
  categoryLabels,
}: {
  bench: BenchmarkSummary
  formatScore: (score: number | null, sourceType: string) => string
  timeAgo: (dateStr: string | null) => string
  expandedChart: string | null
  setExpandedChart: (slug: string | null) => void
  categoryLabels: Record<string, string>
}) {
  const isExpanded = expandedChart === bench.slug
  const hasData = bench.leaderboard_data.length > 0
  const hasChart = bench.chart_image_url || bench.chart_embed_url

  return (
    <div className="dark:bg-secondary/10 rounded-lg border border-zinc-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800/50">
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">{bench.icon || "📊"}</span>
            <h3 className="text-foreground font-medium">{bench.name}</h3>
            {bench.org && <span className="text-muted-foreground text-xs">by {bench.org}</span>}
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[bench.category] || bench.category}
            </Badge>
            {hasData && (
              <Badge
                variant="outline"
                className="border-green-200 text-xs text-green-700 dark:border-green-800 dark:text-green-400"
              >
                ● Live
              </Badge>
            )}
            {bench.fetch_status === "error" && (
              <Badge variant="destructive" className="text-xs">
                Error
              </Badge>
            )}
          </div>

          <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">{bench.description}</p>

          {/* Tags */}
          {bench.tags && bench.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {bench.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="bg-secondary/50 text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
                >
                  {tag}
                </span>
              ))}
              {bench.tags.length > 5 && (
                <span className="text-muted-foreground text-[10px]">+{bench.tags.length - 5}</span>
              )}
            </div>
          )}

          {/* Top results table */}
          {hasData && (
            <div className="mb-3 space-y-1">
              {bench.leaderboard_data.slice(0, 5).map((entry, i) => (
                <div key={`${bench.slug}-${i}`} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-5 text-right text-xs font-medium">
                    #{entry.rank || i + 1}
                  </span>
                  <span className="text-foreground flex-1 truncate font-medium">{entry.model}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {formatScore(entry.score, bench.source_type)}
                  </span>
                </div>
              ))}
              {bench.leaderboard_data.length > 5 && (
                <p className="text-muted-foreground text-xs">
                  +{bench.leaderboard_data.length - 5} more models
                </p>
              )}
            </div>
          )}

          {!hasData && (
            <div className="text-muted-foreground mb-3 text-xs italic">
              {bench.fetch_status === "pending"
                ? "Awaiting first data fetch…"
                : "Link to external benchmark"}
            </div>
          )}

          {/* Meta row */}
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
            {bench.top_model && bench.top_score !== null && (
              <span>
                🏆 <strong>{bench.top_model}</strong>{" "}
                {formatScore(bench.top_score, bench.source_type)}
              </span>
            )}
            {bench.total_models > 0 && <span>{bench.total_models} models</span>}
            {bench.last_fetched_at && <span>Updated {timeAgo(bench.last_fetched_at)}</span>}
          </div>
        </div>

        {/* Right side: chart + links */}
        <div className="flex flex-shrink-0 flex-col gap-2 lg:w-64">
          {/* Chart preview / expand button */}
          {hasChart && (
            <div className="space-y-1">
              {bench.chart_embed_url && !bench.chart_image_url && (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setExpandedChart(isExpanded ? null : bench.slug)}
                  >
                    {isExpanded ? "Hide Chart" : "Show Live Chart"}
                  </Button>
                  {isExpanded && (
                    <div className="mt-2 overflow-hidden rounded-md border dark:border-zinc-700">
                      <iframe
                        src={bench.chart_embed_url}
                        className="h-80 w-full border-0"
                        loading="lazy"
                        title={`${bench.name} chart`}
                      />
                    </div>
                  )}
                </div>
              )}
              {bench.chart_image_url && (
                <Link href={bench.chart_image_url} target="_blank" rel="noopener">
                  <div className="bg-secondary/30 hover:bg-secondary/50 flex items-center justify-center overflow-hidden rounded-md border transition-colors dark:border-zinc-700">
                    <img
                      src={bench.chart_image_url}
                      alt={`${bench.name} chart`}
                      className="h-auto w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Action links */}
          <div className="flex flex-col gap-1">
            {bench.website_url && (
              <Button variant="ghost" size="sm" asChild className="h-7 justify-start text-xs">
                <Link href={bench.website_url} target="_blank" rel="noopener">
                  🌐 Website
                </Link>
              </Button>
            )}
            {bench.paper_url && (
              <Button variant="ghost" size="sm" asChild className="h-7 justify-start text-xs">
                <Link href={bench.paper_url} target="_blank" rel="noopener">
                  📄 Paper
                </Link>
              </Button>
            )}
            {bench.repo_url && (
              <Button variant="ghost" size="sm" asChild className="h-7 justify-start text-xs">
                <Link href={bench.repo_url} target="_blank" rel="noopener">
                  📦 Repository
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
