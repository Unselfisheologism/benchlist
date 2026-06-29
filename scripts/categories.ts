/**
 * AI Benchmark Categories initialization script
 * Run: npx tsx scripts/categories.ts
 */

import { createClient } from "@/lib/supabase/server"

const AI_BENCHMARK_CATEGORIES = [
  { id: "reasoning", name: "Reasoning & Logic" },
  { id: "coding", name: "Coding & Software Engineering" },
  { id: "math", name: "Mathematics" },
  { id: "science", name: "Science & Knowledge" },
  { id: "nlp", name: "Natural Language Processing" },
  { id: "reading-comprehension", name: "Reading Comprehension" },
  { id: "language-modeling", name: "Language Modeling" },
  { id: "text-generation", name: "Text Generation" },
  { id: "summarization", name: "Summarization" },
  { id: "translation", name: "Translation" },
  { id: "creative-writing", name: "Creative Writing" },
  { id: "vision", name: "Computer Vision" },
  { id: "image-generation", name: "Image Generation" },
  { id: "video-understanding", name: "Video Understanding" },
  { id: "audio-speech", name: "Audio & Speech" },
  { id: "multimodal", name: "Multimodal (General)" },
  { id: "agentic", name: "Agentic & Tool Use" },
  { id: "web-browsing", name: "Web Browsing" },
  { id: "computer-use", name: "Computer Use" },
  { id: "mcp", name: "MCP & Integrations" },
  { id: "planning", name: "Planning & Navigation" },
  { id: "safety", name: "Safety & Alignment" },
  { id: "hallucination", name: "Hallucination Detection" },
  { id: "factuality", name: "Factuality & Truthfulness" },
  { id: "jailbreak", name: "Jailbreak Resistance" },
  { id: "swe-bench", name: "Software Engineering (SWE-Bench)" },
  { id: "qa-verification", name: "QA & Verification" },
  { id: "information-retrieval", name: "Information Retrieval" },
  { id: "long-context", name: "Long Context" },
  { id: "retrieval-augmented", name: "RAG Benchmarks" },
  { id: "leaderboard", name: "Leaderboards & Aggregates" },
  { id: "human-eval", name: "Human Evaluation" },
  { id: "automated-eval", name: "Automated Evaluation" },
  { id: "open-ended", name: "Open-Ended Evaluation" },
  { id: "medical", name: "Medical & Healthcare" },
  { id: "legal", name: "Legal" },
  { id: "finance", name: "Finance" },
  { id: "education", name: "Education" },
  { id: "creative", name: "Creative & Design" },
]

async function initializeCategories() {
  const supabase = await createClient()

  const { data: existingCategories } = await supabase
    .from("categories")
    .select("id")
    .in(
      "id",
      AI_BENCHMARK_CATEGORIES.map((c) => c.id),
    )

  const existingIds = new Set((existingCategories || []).map((c) => c.id))
  const newCategories = AI_BENCHMARK_CATEGORIES.filter((c) => !existingIds.has(c.id))

  if (newCategories.length === 0) {
    console.log("✅ All AI benchmark categories already exist!")
    return
  }

  const { error } = await supabase.from("categories").insert(newCategories)
  if (error) {
    console.error("❌ Error initializing categories:", error)
    process.exit(1)
  }

  console.log(`✅ ${newCategories.length} AI benchmark categories initialized successfully!`)
}

initializeCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error initializing categories:", error)
    process.exit(1)
  })
