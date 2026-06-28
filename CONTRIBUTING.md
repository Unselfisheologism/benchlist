# Contributing to Benchlist

Thank you for your interest in contributing to Benchlist! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/benchlist.git
   cd benchlist
   ```
3. Create a branch for your feature:
   ```bash
   git checkout -b feature/my-feature
   ```
4. Install dependencies:
   ```bash
   bun install
   ```
5. Start the development server:
   ```bash
   bun run dev
   ```

## Development Workflow

- Make your changes in small, focused commits
- Write clear commit messages
- Test your changes locally before pushing
- Run `bun run lint` and `bun run build` to catch issues

## Submitting a Pull Request

1. Push your branch to your fork
2. Open a Pull Request against the `main` branch
3. Describe what your changes do and why
4. Link any related issues

## Adding a Benchmark

If you want to add a new benchmark to the directory, you can either:

1. **Submit via the UI** — go to `/projects/submit` and fill out the form
2. **Submit via PR** — add benchmark data to the seed script in `scripts/`

## Code Style

- Use TypeScript for all new files
- Follow the existing code patterns and naming conventions
- Keep components small and focused
- Use Tailwind CSS for styling

## Questions?

Open an issue or start a discussion on GitHub.

Thank you for contributing to Benchlist!
