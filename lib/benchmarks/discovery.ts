/**
 * arXiv Discovery Pipeline
 *
 * Monitors arXiv for new AI benchmark papers.
 * Uses the arXiv API (RSS/Atom) to discover new benchmarks
 * in cs.CL and cs.AI categories.
 */
import type { BenchmarkDiscovery } from "./types"

const ARXIV_API_BASE = "http://export.arxiv.org/api/query"

/** Keywords that indicate a benchmark/leaderboard paper */
const BENCHMARK_KEYWORDS = [
  "benchmark",
  "leaderboard",
  "evaluation framework",
  "evaluating language models",
  "model evaluation",
  "capability assessment",
  "performance comparison",
  "frontier model",
]

/** arXiv categories to monitor */
const TARGET_CATEGORIES = ["cs.CL", "cs.AI", "cs.LG"]

/**
 * Search arXiv for recent benchmark-related papers.
 *
 * @param maxResults - Maximum papers to return (default 20)
 * @param daysBack - How many days back to search (default 7)
 */
export async function searchArxivBenchmarks(
  maxResults: number = 20,
  daysBack: number = 7,
): Promise<BenchmarkDiscovery[]> {
  try {
    const query = BENCHMARK_KEYWORDS.map((kw) => `all:"${kw}"`).join("+OR+")
    const categoryFilter = TARGET_CATEGORIES.map((cat) => `cat:${cat}`).join("+OR+")
    const searchQuery = `(${query})+AND+(${categoryFilter})`

    const params = new URLSearchParams({
      search_query: searchQuery,
      start: "0",
      max_results: String(maxResults),
      sortBy: "submittedDate",
      sortOrder: "descending",
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(`${ARXIV_API_BASE}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Benchlist/1.0 (AI Benchmark Aggregator)",
        Accept: "application/atom+xml,application/xml,text/xml",
      },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const xml = await res.text()
    const entries = parseArxivAtom(xml, daysBack)

    return entries
  } catch (error) {
    console.error("[arxiv] Search failed:", error)
    return []
  }
}

/**
 * Parse arXiv Atom XML response into discovery entries.
 */
function parseArxivAtom(xml: string, daysBack: number): BenchmarkDiscovery[] {
  const results: BenchmarkDiscovery[] = []
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - daysBack)

  // Simple XML parsing (no external deps needed for CF Workers)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let entryMatch

  while ((entryMatch = entryRegex.exec(xml)) !== null) {
    const entryXml = entryMatch[1]

    const title = extractTag(entryXml, "title")?.replace(/\s+/g, " ").trim() || ""
    const link = extractTag(entryXml, "id") || ""
    const summary = extractTag(entryXml, "summary")?.replace(/\s+/g, " ").trim() || ""
    const published = extractTag(entryXml, "published") || ""

    // Check if within date range
    const pubDate = new Date(published)
    if (pubDate < cutoff) continue

    // Check if title/summary mentions benchmarks
    const combined = `${title} ${summary}`.toLowerCase()
    const isBenchmark = BENCHMARK_KEYWORDS.some((kw) => combined.includes(kw.toLowerCase()))

    if (isBenchmark && title && link) {
      results.push({
        title,
        url: link,
        summary: summary.slice(0, 500),
        published,
        source: "arxiv",
        already_tracked: false, // Will be enriched later
      })
    }
  }

  return results
}

/**
 * Extract content of an XML tag (simple, no namespace handling).
 */
function extractTag(xml: string, tag: string): string | null {
  // Try with namespace prefix (e.g., <entry:title>)
  const nsRegex = new RegExp(`<[^>]*:${tag}[^>]*>([\\s\\S]*?)<\\/[^>]*:${tag}>`, "i")
  const nsMatch = nsRegex.exec(xml)
  if (nsMatch) return nsMatch[1]

  // Try without namespace
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i")
  const match = regex.exec(xml)
  return match ? match[1] : null
}

/**
 * Enrich discovery results with tracking status.
 * Checks if any discovered benchmarks are already in the app's database.
 */
export function enrichWithTrackingStatus(
  discoveries: BenchmarkDiscovery[],
  existingSlugs: string[],
): BenchmarkDiscovery[] {
  return discoveries.map((d) => {
    const lower = d.title.toLowerCase()
    const alreadyTracked = existingSlugs.some(
      (slug) => lower.includes(slug.replace(/-/g, " ")) || lower.includes(slug.replace(/-/g, "")),
    )
    return { ...d, already_tracked: alreadyTracked }
  })
}
