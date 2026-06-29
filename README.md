# Benchlist

The open directory of AI model benchmarks.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<p align="center">
  <a href="https://benchlist.dev" target="_blank">
    <img src="og.png" alt="Benchlist" width="800px" />
  </a>
</p>

## About

Benchlist is the open directory for AI model benchmarks. Discover, track, and compare every public AI benchmark — from SWE-Bench to ARC-AGI, HLE to MMLU, and hundreds more.

Key features:

- **Auto-updated benchmarks** — data is fetched automatically from benchmark websites on a regular schedule
- **Community submissions** — submit any public AI benchmark to the directory
- **Upvotes & comments** — vote and discuss benchmarks with the community
- **Category browsing** — filter by reasoning, coding, vision, safety, agentic, and 35+ categories
- **Trending & search** — find the most popular and recently added benchmarks

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via Drizzle ORM)
- **Auth:** Better Auth (GitHub, Google OAuth)
- **Styling:** Tailwind CSS
- **Payments:** Dodo Payments
- **File Upload:** UploadThing
- **Hosting:** Vercel

## Getting Started

```bash
git clone https://github.com/your-username/benchlist.git
cd benchlist
bun install
bun run dev
```

Copy `.env.example` to `.env.local` and fill in the required values.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.
