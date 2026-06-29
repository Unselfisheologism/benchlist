// lib/comment.config.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

// NOTE: @fuma-comment Drizzle adapter is not compatible with Supabase client.
// This file needs a custom Supabase adapter or the comment system needs to be reimplemented.
// For now, stub the adapters so the app doesn't break.

// Stub auth adapter - comments will appear as anonymous until a real adapter is built
// Inline type to avoid module resolution issues with @fuma-comment/server internal types
type Awaitable<T> = T | Promise<T>
interface AuthInfo {
  id: string
  name?: string
  email?: string
  image?: string
  role?: string
}
const stubAuth: { getSession: (request: unknown) => Awaitable<AuthInfo | null> } = {
  getSession: async () => null,
}

export const commentAuth = stubAuth

// Stub storage adapter - provides a minimal Drizzle-compatible interface
// The comment system is not functional - this is just a stub to prevent build errors
export const commentStorage = undefined as unknown as any
