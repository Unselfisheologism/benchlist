/**
 * Model Name Normalization
 *
 * Different benchmarks list the same model with different names:
 * - SWE-bench: "gpt-4o-2024-05-13"
 * - Aider: "gpt-4o"
 * - LMSYS: "GPT-4o"
 * - HF: "Meta-Llama-3.1-405B"
 *
 * This module maps diverse naming formats to a unified canonical name.
 */

/** Canonical model identity */
export interface NormalizedModel {
  /** Human-readable canonical name (e.g. "GPT-4o", "Claude 3.5 Sonnet") */
  canonical: string
  /** Provider/org (e.g. "OpenAI", "Anthropic", "Meta") */
  provider: string
  /** Parameter count if known (e.g. "405B", "70B") */
  params?: string
  /** Variant tag (e.g. "high", "medium", "2024-05-13") */
  variant?: string
}

/**
 * Canonical name mappings — add new models here as they appear.
 * Keys are lowercase normalized forms; values are canonical names.
 */
const CANONICAL_MAP: Record<string, NormalizedModel> = {
  // OpenAI
  "gpt-4o": { canonical: "GPT-4o", provider: "OpenAI" },
  "gpt-4o-2024-05-13": { canonical: "GPT-4o", provider: "OpenAI", variant: "2024-05-13" },
  "gpt-4o-2024-08-06": { canonical: "GPT-4o", provider: "OpenAI", variant: "2024-08-06" },
  "gpt-4o-2024-11-20": { canonical: "GPT-4o", provider: "OpenAI", variant: "2024-11-20" },
  "gpt-4-turbo": { canonical: "GPT-4 Turbo", provider: "OpenAI" },
  "gpt-4": { canonical: "GPT-4", provider: "OpenAI" },
  "gpt-4.5": { canonical: "GPT-4.5", provider: "OpenAI" },
  "gpt-4.5 (preview)": { canonical: "GPT-4.5", provider: "OpenAI", variant: "preview" },
  "gpt-4.5-preview": { canonical: "GPT-4.5", provider: "OpenAI", variant: "preview" },
  o1: { canonical: "OpenAI o1", provider: "OpenAI" },
  "o1-mini": { canonical: "OpenAI o1-mini", provider: "OpenAI" },
  "o1-preview": { canonical: "OpenAI o1", provider: "OpenAI", variant: "preview" },
  o3: { canonical: "OpenAI o3", provider: "OpenAI" },
  "o3-mini": { canonical: "OpenAI o3-mini", provider: "OpenAI" },
  "o4-mini": { canonical: "OpenAI o4-mini", provider: "OpenAI" },
  "openai o3": { canonical: "OpenAI o3", provider: "OpenAI" },
  "openai o4-mini": { canonical: "OpenAI o4-mini", provider: "OpenAI" },
  "openai o1": { canonical: "OpenAI o1", provider: "OpenAI" },

  // Anthropic
  "claude 3.5 sonnet": { canonical: "Claude 3.5 Sonnet", provider: "Anthropic" },
  "claude-3.5-sonnet": { canonical: "Claude 3.5 Sonnet", provider: "Anthropic" },
  "claude 3.5 sonnet (latest)": {
    canonical: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    variant: "latest",
  },
  "claude-3-5-sonnet": { canonical: "Claude 3.5 Sonnet", provider: "Anthropic" },
  "claude-3-5-sonnet-20241022": {
    canonical: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    variant: "20241022",
  },
  "claude 3 opus": { canonical: "Claude 3 Opus", provider: "Anthropic" },
  "claude-3-opus": { canonical: "Claude 3 Opus", provider: "Anthropic" },
  "claude 3 haiku": { canonical: "Claude 3 Haiku", provider: "Anthropic" },
  "claude-3-haiku": { canonical: "Claude 3 Haiku", provider: "Anthropic" },
  "claude 4 sonnet": { canonical: "Claude 4 Sonnet", provider: "Anthropic" },
  "claude-4-sonnet": { canonical: "Claude 4 Sonnet", provider: "Anthropic" },

  // Google
  "gemini 2.5 pro": { canonical: "Gemini 2.5 Pro", provider: "Google" },
  "gemini-2.5-pro": { canonical: "Gemini 2.5 Pro", provider: "Google" },
  "gemini 2.0 flash": { canonical: "Gemini 2.0 Flash", provider: "Google" },
  "gemini-2.0-flash": { canonical: "Gemini 2.0 Flash", provider: "Google" },
  "gemini 1.5 pro": { canonical: "Gemini 1.5 Pro", provider: "Google" },
  "gemini-1.5-pro": { canonical: "Gemini 1.5 Pro", provider: "Google" },

  // Meta
  "llama 3.1 405b": { canonical: "Llama 3.1 405B", provider: "Meta" },
  "meta-llama-3.1-405b": { canonical: "Llama 3.1 405B", provider: "Meta" },
  "meta-llama-3.1-405b-instruct": { canonical: "Llama 3.1 405B", provider: "Meta" },
  "llama-3.1-405b": { canonical: "Llama 3.1 405B", provider: "Meta" },
  "llama 3.1 70b": { canonical: "Llama 3.1 70B", provider: "Meta" },
  "meta-llama-3.1-70b": { canonical: "Llama 3.1 70B", provider: "Meta" },
  "meta-llama-3.1-70b-instruct": { canonical: "Llama 3.1 70B", provider: "Meta" },
  "llama-3.1-70b": { canonical: "Llama 3.1 70B", provider: "Meta" },
  "llama 3.1 8b": { canonical: "Llama 3.1 8B", provider: "Meta" },
  "meta-llama-3.1-8b": { canonical: "Llama 3.1 8B", provider: "Meta" },
  "meta-llama-3.1-8b-instruct": { canonical: "Llama 3.1 8B", provider: "Meta" },
  "llama-3.1-8b": { canonical: "Llama 3.1 8B", provider: "Meta" },
  "llama 3 70b": { canonical: "Llama 3 70B", provider: "Meta" },
  "meta-llama-3-70b": { canonical: "Llama 3 70B", provider: "Meta" },
  "llama 4 scout": { canonical: "Llama 4 Scout", provider: "Meta" },
  "llama-4-scout": { canonical: "Llama 4 Scout", provider: "Meta" },
  "llama 4 maverick": { canonical: "Llama 4 Maverick", provider: "Meta" },
  "llama-4-maverick": { canonical: "Llama 4 Maverick", provider: "Meta" },

  // DeepSeek
  "deepseek-v3": { canonical: "DeepSeek-V3", provider: "DeepSeek" },
  "deepseek-v3-0324": { canonical: "DeepSeek-V3", provider: "DeepSeek", variant: "0324" },
  "deepseek-v2.5": { canonical: "DeepSeek-V2.5", provider: "DeepSeek" },
  "deepseek-r1": { canonical: "DeepSeek-R1", provider: "DeepSeek" },

  // Qwen
  "qwen2.5-72b": { canonical: "Qwen2.5-72B", provider: "Alibaba" },
  "qwen2.5-72b-instruct": { canonical: "Qwen2.5-72B", provider: "Alibaba" },
  "qwen2.5-coder-32b": { canonical: "Qwen2.5-Coder-32B", provider: "Alibaba" },
  "qwen2.5-32b": { canonical: "Qwen2.5-32B", provider: "Alibaba" },
  "qwen2.5-14b": { canonical: "Qwen2.5-14B", provider: "Alibaba" },
  "qwen2.5-7b": { canonical: "Qwen2.5-7B", provider: "Alibaba" },

  // Mistral
  "mistral-large-2": { canonical: "Mistral Large 2", provider: "Mistral" },
  "mistral-large-latest": { canonical: "Mistral Large", provider: "Mistral" },

  // xAI
  "grok-3": { canonical: "Grok-3", provider: "xAI" },
  "grok-2": { canonical: "Grok-2", provider: "xAI" },

  // Google Gemma
  "gemma-2-27b": { canonical: "Gemma 2 27B", provider: "Google" },
  "gemma-2-9b": { canonical: "Gemma 2 9B", provider: "Google" },
}

/**
 * Normalize a model name from any benchmark format to a canonical name.
 *
 * @param rawName - The model name as reported by the benchmark
 * @returns The canonical model name, or the original name if no mapping found
 */
export function normalizeModelName(rawName: string): string {
  const key = rawName.toLowerCase().trim().replace(/\s+/g, " ").replace(/[""]/g, '"')

  const mapped = CANONICAL_MAP[key]
  if (mapped) return mapped.canonical

  // Fuzzy: try removing common suffixes
  const stripped = key
    .replace(/\s*-\s*instruct$/i, "")
    .replace(/\s*-\s*chat$/i, "")
    .replace(/\s*-\s*base$/i, "")
    .replace(/\s*-\s*preview$/i, "")
    .trim()

  const fuzzyMatch = CANONICAL_MAP[stripped]
  if (fuzzyMatch) return fuzzyMatch.canonical

  // Return title-cased original if no mapping
  return rawName.trim()
}

/**
 * Get full model metadata from a raw name.
 */
export function getModelMetadata(rawName: string): NormalizedModel {
  const key = rawName.toLowerCase().trim().replace(/\s+/g, " ").replace(/[""]/g, '"')

  const mapped = CANONICAL_MAP[key]
  if (mapped) return mapped

  return {
    canonical: rawName.trim(),
    provider: guessProvider(rawName),
  }
}

/**
 * Guess provider from name patterns.
 */
function guessProvider(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes("gpt") || lower.includes("o1") || lower.includes("o3") || lower.includes("o4"))
    return "OpenAI"
  if (lower.includes("claude")) return "Anthropic"
  if (lower.includes("gemini") || lower.includes("gemma")) return "Google"
  if (lower.includes("llama")) return "Meta"
  if (lower.includes("deepseek")) return "DeepSeek"
  if (lower.includes("qwen")) return "Alibaba"
  if (lower.includes("mistral")) return "Mistral"
  if (lower.includes("grok")) return "xAI"
  if (lower.includes("phi")) return "Microsoft"
  return "Unknown"
}

/**
 * Normalize a list of benchmark entries, deduplicating by canonical model name.
 * When duplicates exist, keeps the entry with the higher score.
 */
export function normalizeEntries<T extends { model: string; score: number }>(
  entries: T[],
): (T & { canonical_model: string })[] {
  const byCanonical = new Map<string, T & { canonical_model: string }>()

  for (const entry of entries) {
    const canonical = normalizeModelName(entry.model)
    const existing = byCanonical.get(canonical)
    if (!existing || entry.score > existing.score) {
      byCanonical.set(canonical, { ...entry, canonical_model: canonical })
    }
  }

  return Array.from(byCanonical.values()).sort((a, b) => b.score - a.score)
}
