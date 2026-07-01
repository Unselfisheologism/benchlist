import type { NextConfig } from "next"

import createMDX from "@next/mdx"
import remarkGfm from "remark-gfm"

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "highlight.js/lib/core": require.resolve("highlight.js/lib/core"),
    }
    return config
  },
  serverExternalPackages: ["lowlight"],

  // Configuration pour MDX
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "designmodo.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "nexty.dev" },
      // Benchmark chart images
      { protocol: "https", hostname: "www.swebench.com" },
      { protocol: "https", hostname: "arcprize.org" },
      { protocol: "https", hostname: "huggingface.co" },
      { protocol: "https", hostname: "*.hf.space" },
      { protocol: "https", hostname: "*.huggingface.co" },
      { protocol: "https", hostname: "opencompass.org.cn" },
      { protocol: "https", hostname: "livecodebench.github.io" },
      { protocol: "https", hostname: "bigcodebench.github.io" },
      { protocol: "https", hostname: "aider.chat" },
      { protocol: "https", hostname: "crfm.stanford.edu" },
      { protocol: "https", hostname: "lastexam.ai" },
      ...(process.env.NEXT_PUBLIC_UPLOADTHING_URL
        ? [{ protocol: "https" as const, hostname: process.env.NEXT_PUBLIC_UPLOADTHING_URL }]
        : []),
    ],
  },
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
  },
})

// Combine MDX and Next.js config
export default withMDX(nextConfig)
