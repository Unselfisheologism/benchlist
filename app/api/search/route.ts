import { unstable_cache } from "next/cache"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

import { API_RATE_LIMITS } from "@/lib/constants"
import { checkRateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

// Définir le type de retour pour la recherche
export interface SearchResult {
  id: string
  name: string
  slug: string | null
  description: string | null
  logoUrl: string | null
  type: "project" | "category"
}

// Fonction de recherche avec mise en cache
const getSearchResults = unstable_cache(
  async (query: string, limit: number = 10): Promise<SearchResult[]> => {
    console.log(`[Search API] Searching for: "${query}"`)

    // Vérifier si la requête est valide
    if (!query || query.length < 2) {
      return []
    }

    try {
      const supabase = await createClient()

      // Rechercher dans les projets
      const { data: projects } = (await supabase
        .from("projects")
        .select("id, name, slug, description, logo_url")
        .ilike("name", `%${query}%`)
        .limit(limit)) as {
        data:
          { id: string; name: string; slug: string; description: string; logo_url: string }[] | null
      }

      // Rechercher dans les catégories
      const { data: categories } = (await supabase
        .from("categories")
        .select("id, name")
        .ilike("name", `%${query}%`)
        .limit(limit)) as { data: { id: string; name: string }[] | null }

      // Formater les résultats
      const formattedProjects: SearchResult[] = (projects || []).map((proj) => ({
        id: proj.id,
        name: proj.name,
        slug: proj.slug,
        description: proj.description,
        logoUrl: proj.logo_url,
        type: "project" as const,
      }))

      const formattedCategories: SearchResult[] = (categories || []).map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: null,
        description: null,
        logoUrl: null,
        type: "category" as const,
      }))

      // Combiner et limiter les résultats
      const combinedResults = [...formattedProjects, ...formattedCategories].slice(0, limit)

      console.log(`[Search API] Found ${combinedResults.length} results`)
      return combinedResults
    } catch (error) {
      console.error("[Search API] Error searching:", error)
      return []
    }
  },
  ["search-results"],
  { revalidate: 60 }, // Revalider le cache toutes les 60 secondes
)

export async function GET(request: NextRequest) {
  try {
    // Obtenir l'IP du client
    const headersList = await headers()
    const forwardedFor = headersList.get("x-forwarded-for")
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1"

    // Vérifier la limite de taux avec les constantes spécifiques pour la recherche
    const rateLimitResult = await checkRateLimit(
      `search-api:${ip}`,
      API_RATE_LIMITS.SEARCH.REQUESTS,
      API_RATE_LIMITS.SEARCH.WINDOW,
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "rate_limit_exceeded",
          message: `Too many requests. Please wait ${rateLimitResult.reset} seconds before trying again.`,
          reset: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": API_RATE_LIMITS.SEARCH.REQUESTS.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        },
      )
    }

    // Récupérer les paramètres de recherche
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q") || ""
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    // Obtenir les résultats de recherche
    const results = await getSearchResults(query, limit)

    // Retourner les résultats avec les en-têtes de rate limit
    return NextResponse.json(
      { results },
      {
        headers: {
          "X-RateLimit-Limit": API_RATE_LIMITS.SEARCH.REQUESTS.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.reset.toString(),
        },
      },
    )
  } catch (error) {
    console.error("[Search API] Error processing request:", error)
    return NextResponse.json(
      {
        error: "search_failed",
        message: "An error occurred while processing your search request. Please try again later.",
      },
      { status: 500 },
    )
  }
}
