import { db } from "@/drizzle/db"
import { category } from "@/drizzle/db/schema"

const AI_BENCHMARK_CATEGORIES = [
  // Core AI Capabilities
  { id: "reasoning", name: "Reasoning & Logic" },
  { id: "coding", name: "Coding & Software Engineering" },
  { id: "math", name: "Mathematics" },
  { id: "science", name: "Science & Knowledge" },
  { id: "nlp", name: "Natural Language Processing" },
  { id: "reading-comprehension", name: "Reading Comprehension" },

  // Language & Generation
  { id: "language-modeling", name: "Language Modeling" },
  { id: "text-generation", name: "Text Generation" },
  { id: "summarization", name: "Summarization" },
  { id: "translation", name: "Translation" },
  { id: "creative-writing", name: "Creative Writing" },

  // Multimodal
  { id: "vision", name: "Computer Vision" },
  { id: "image-generation", name: "Image Generation" },
  { id: "video-understanding", name: "Video Understanding" },
  { id: "audio-speech", name: "Audio & Speech" },
  { id: "multimodal", name: "Multimodal (General)" },

  // Agents & Tool Use
  { id: "agentic", name: "Agentic & Tool Use" },
  { id: "web-browsing", name: "Web Browsing" },
  { id: "computer-use", name: "Computer Use" },
  { id: "mcp", name: "MCP & Integrations" },
  { id: "planning", name: "Planning & Navigation" },

  // Safety & Alignment
  { id: "safety", name: "Safety & Alignment" },
  { id: "hallucination", name: "Hallucination Detection" },
  { id: "factuality", name: "Factuality & Truthfulness" },
  { id: "jailbreak", name: "Jailbreak Resistance" },

  // Real-World Tasks
  { id: "swe-bench", name: "Software Engineering (SWE-Bench)" },
  { id: "qa-verification", name: "QA & Verification" },
  { id: "information-retrieval", name: "Information Retrieval" },
  { id: "long-context", name: "Long Context" },
  { id: "retrieval-augmented", name: "RAG Benchmarks" },

  // Evaluation Frameworks
  { id: "leaderboard", name: "Leaderboards & Aggregates" },
  { id: "human-eval", name: "Human Evaluation" },
  { id: "automated-eval", name: "Automated Evaluation" },
  { id: "open-ended", name: "Open-Ended Evaluation" },

  // Domain-Specific
  { id: "medical", name: "Medical & Healthcare" },
  { id: "legal", name: "Legal" },
  { id: "finance", name: "Finance" },
  { id: "education", name: "Education" },
  { id: "creative", name: "Creative & Design" },
]

const initializeCategories = async () => {
  const data = await db
  const categories = await data.query.category.findMany()
  if (categories.length === 0) {
    await data.insert(category).values(AI_BENCHMARK_CATEGORIES)
  }
}

try {
  initializeCategories().then(() => {
    console.log("✅ AI benchmark categories initialized successfully!")
  })
} catch (error) {
  console.error("❌ Error initializing categories:", error)
}
