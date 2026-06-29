import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ProjectSection } from "@/components/home/project-section"
import { getMonthBestProjects, getTodayProjects, getYesterdayProjects } from "@/app/actions/home"
import { getLast30DaysPageviews, getLast30DaysVisitors } from "@/app/actions/plausible"
import { getTopCategories } from "@/app/actions/projects"

export default async function Home() {
  const todayProjects = await getTodayProjects()
  const yesterdayProjects = await getYesterdayProjects()
  const monthProjects = await getMonthBestProjects()
  const topCategories = await getTopCategories(8)

  const last30DaysVisitors = await getLast30DaysVisitors()
  const last30DaysPageviews = await getLast30DaysPageviews()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="noise-overlay relative overflow-hidden border-b">
        <div className="from-primary/5 to-chart-2/5 absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="relative container mx-auto max-w-6xl px-4 py-12 text-center md:py-16">
          <div className="mx-auto max-w-2xl space-y-4">
            <h1 className="font-heading text-3xl font-bold tracking-tight md:text-5xl">
              The open directory of <span className="text-primary">AI benchmarks</span>
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-base md:text-lg">
              Discover, track, and compare every public AI benchmark. From SWE-Bench to ARC-AGI, HLE
              to MMLU — updated automatically.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button asChild size="lg">
                <Link href="/categories">Browse Benchmarks</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/projects/submit">Submit a Benchmark</Link>
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="text-muted-foreground mx-auto mt-8 flex max-w-md items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-foreground font-bold">{todayProjects.length}+</span> active
              benchmarks
            </div>
            <div className="bg-border h-4 w-px" />
            <div className="flex items-center gap-1.5">
              <span className="text-foreground font-bold">Auto-updated</span> weekly
            </div>
            <div className="bg-border hidden h-4 w-px sm:block" />
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="text-foreground font-bold">Community</span> driven
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 pt-8 pb-12 md:pt-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3 lg:items-start">
          {/* Main column */}
          <div className="space-y-6 sm:space-y-8 lg:col-span-2">
            <ProjectSection
              title="Trending This Week"
              projects={todayProjects}
              sortByUpvotes={true}
              isAuthenticated={!!user}
            />

            <ProjectSection
              title="Recently Added"
              projects={yesterdayProjects}
              moreHref="/trending?filter=yesterday"
              sortByUpvotes={true}
              isAuthenticated={!!user}
            />

            <ProjectSection
              title="Most Popular"
              projects={monthProjects}
              moreHref="/trending?filter=month"
              sortByUpvotes={true}
              isAuthenticated={!!user}
            />
          </div>

          {/* Sidebar */}
          <div className="top-24 space-y-6">
            {/* Quick Stats */}
            {(last30DaysVisitors !== null || last30DaysPageviews !== null) && (
              <div className="space-y-3">
                <h3 className="font-semibold">Directory Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  {last30DaysVisitors !== null && (
                    <div className="bench-card p-3 text-center">
                      <div className="text-xl font-bold">{last30DaysVisitors}</div>
                      <div className="text-muted-foreground text-xs">Visitors (30d)</div>
                    </div>
                  )}
                  {last30DaysPageviews !== null && (
                    <div className="bench-card p-3 text-center">
                      <div className="text-xl font-bold">{last30DaysPageviews}</div>
                      <div className="text-muted-foreground text-xs">Page Views (30d)</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Top Categories</h3>
                <Button variant="ghost" size="sm" className="text-sm" asChild>
                  <Link href="/categories">View all</Link>
                </Button>
              </div>
              <div className="space-y-1">
                {topCategories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/categories?category=${category.id}`}
                    className={cn(
                      "-mx-2 flex items-center justify-between rounded-md p-2 text-sm transition-colors",
                      "hover:bg-muted/40",
                    )}
                  >
                    <span>{category.name}</span>
                    <span className="text-muted-foreground bg-secondary rounded-full px-2 py-0.5 text-xs">
                      {category.count}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-3">
              <h3 className="font-semibold">Quick Access</h3>
              <div className="space-y-1">
                {user && (
                  <Link
                    href="/dashboard"
                    className="-mx-2 flex items-center gap-2 rounded-md p-2 text-sm transition-colors hover:underline"
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  href="/trending"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 text-sm transition-colors hover:underline"
                >
                  Trending Benchmarks
                </Link>
                <Link
                  href="/projects/submit"
                  className="-mx-2 flex items-center gap-2 rounded-md p-2 text-sm transition-colors hover:underline"
                >
                  Submit a Benchmark
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
