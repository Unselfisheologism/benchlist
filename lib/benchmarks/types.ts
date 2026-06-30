/**
 * AI Benchmark types and interfaces
 */

export interface BenchmarkEntry {
  model: string
  score: number
  rank?: number
  date?: string
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
}

export interface FetchResult {
  slug: string
  entries: BenchmarkEntry[]
  total_models: number
  top_model: string
  top_score: number
  last_updated: string
  error?: string
}

/** A benchmark source paired with its fetch function */
export interface BenchmarkDef extends BenchmarkSource {
  fetch: () => Promise<FetchResult>
}
