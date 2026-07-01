/**
 * AI Benchmark types and interfaces
 */

export interface BenchmarkEntry {
  model: string
  /** Normalized canonical model name */
  canonical_model?: string
  score: number
  rank?: number
  date?: string
  /** Benchmark version/variant (e.g. "v2", "verified", "lite") */
  benchmark_version?: string
  metadata?: Record<string, unknown>
}

export interface BenchmarkSource {
  slug: string
  name: string
  description: string
  category: string
  source_type: string
  source_url: string
  methodology?: string
  paper_url?: string
  repo_url?: string
  logo_url?: string
  website_url?: string
  /** Benchmark version/variant this source tracks */
  benchmark_version?: string
  /** How often this benchmark updates (e.g. "daily", "weekly", "monthly") */
  update_frequency?: string
  /** Tier: "aggregator" | "direct" | "discovery" */
  tier?: "aggregator" | "direct" | "discovery"
  /** Static image URL of the chart/leaderboard */
  chart_image_url?: string
  /** Embeddable URL for live chart (HF Space iframe, Gradio widget, etc.) */
  chart_embed_url?: string
  /** Emoji icon for the benchmark */
  icon?: string
  /** Searchable tags */
  tags?: string[]
  /** Optional: org/lab that created this benchmark */
  org?: string
  /** Optional: when was the benchmark last updated */
  last_updated_date?: string
}

export interface FetchResult {
  slug: string
  entries: BenchmarkEntry[]
  total_models: number
  top_model: string
  top_score: number
  last_updated: string
  error?: string
  /** The benchmark version that was fetched */
  benchmark_version?: string
}

/** A benchmark source paired with its fetch function */
export interface BenchmarkDef extends BenchmarkSource {
  fetch: () => Promise<FetchResult>
}

/** Discovery result from arXiv / HF Papers */
export interface BenchmarkDiscovery {
  title: string
  url: string
  summary: string
  published: string
  source: "arxiv" | "hf-papers"
  /** Whether this benchmark is already tracked */
  already_tracked: boolean
}
