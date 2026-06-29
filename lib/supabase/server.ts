import { cookies } from "next/headers"

import { createServerClient } from "@supabase/ssr"

export async function createClient(): Promise<ReturnType<typeof createServerClient> | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build (CI without .env) or when env vars are not yet injected,
  // return null rather than crashing. Callers handle null gracefully.
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl === "undefined" ||
    supabaseKey === "undefined" ||
    !supabaseUrl.startsWith("http") ||
    supabaseUrl === "undefined"
  ) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}
