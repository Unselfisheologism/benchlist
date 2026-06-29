/* eslint-disable @next/next/no-img-element */
import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ArrowLeft, Calendar, Clock } from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"

import { DOMAIN_AUTHORITY } from "@/lib/constants"
import { createClient } from "@/lib/supabase/server"
import { TableOfContents } from "@/components/blog/table-of-contents"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  const supabase = await createClient()
  const { data: article } = await supabase
    .from("seo_articles")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .single()

  if (!article) {
    return {
      title: "Review not found | Benchlist",
      description: "The review you're looking for doesn't exist or has been removed.",
    }
  }

  const { title, description, meta_title, meta_description } = article as Record<string, string>

  return {
    title: (meta_title as string) || `${title} | Benchlist`,
    description: (meta_description as string) || description,
    keywords: "review, product review, analysis, evaluation",
    authors: [{ name: "Benchlist Team" }],
    category: "Technology",
    openGraph: {
      title: (meta_title as string) || `${title} | Benchlist`,
      description: (meta_description as string) || description,
      type: "article",
      publishedTime: article[0].publishedAt.toISOString(),
      siteName: "Benchlist",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: (meta_title as string) || `${title} | Benchlist`,
      description: (meta_description as string) || description,
      creator: "@benchlist",
      site: "@benchlist",
    },
    alternates: {
      canonical: `/reviews/${slug}`,
    },
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200
  const words = content.split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min read`
}

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: article } = await supabase
    .from("seo_articles")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .single()

  if (!article) {
    notFound()
  }

  const {
    title,
    description,
    content: articleContent,
    published_at,
    image,
  } = article as Record<string, string>
  const readingTime = calculateReadingTime(articleContent)

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-4">
          <Link
            href="/reviews"
            className="text-muted-foreground hover:text-foreground inline-flex items-center transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reviews
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-10">
          {/* Main Content */}
          <div className="lg:col-span-7">
            <article>
              {/* Article Header */}
              <header className="mb-8">
                {/* Meta Information */}
                <div className="text-muted-foreground mb-4 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={published_at ? new Date(published_at).toISOString() : ""}>
                      {formatDate(published_at ? new Date(published_at) : new Date())}
                    </time>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{readingTime}</span>
                  </div>
                </div>

                {/* Title */}
                <h1 className="mb-4 text-2xl font-bold md:text-4xl">{title}</h1>

                {/* Description */}
                <p className="text-muted-foreground mb-6 text-lg leading-relaxed">{description}</p>

                {/* Hero Image */}
                {article[0].image && (
                  <div className="bg-muted mb-8 aspect-[16/9] overflow-hidden rounded-lg">
                    <img src={image} alt={title} className="h-full w-full object-cover" />
                  </div>
                )}
              </header>

              {/* Article Content */}
              <div className="prose prose-neutral dark:prose-invert [&_table]:border-border [&_thead]:bg-muted/30 [&_th]:border-border [&_th]:text-foreground [&_td]:border-border [&_tbody_tr:hover]:bg-muted/20 [&_img]:border-border max-w-none [&_img]:mx-auto [&_img]:rounded-lg [&_img]:border [&_img]:sm:max-w-xl [&_table]:my-8 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_tbody_tr:last-child_td]:border-b-0 [&_td]:border-r [&_td]:border-b [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:text-sm [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-b [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:align-middle [&_th]:text-sm [&_th]:font-bold [&_th:last-child]:border-r-0">
                <MDXRemote
                  source={articleContent}
                  options={{
                    mdxOptions: {
                      remarkPlugins: [remarkGfm],
                    },
                  }}
                />
              </div>
            </article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-3">
            <div className="sticky top-20 space-y-4">
              {/* Table of Contents */}
              <TableOfContents />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
