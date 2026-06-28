"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { RiExternalLinkLine, RiFilePaper2Line, RiGitRepositoryLine } from "@remixicon/react"

import { ProjectCardButtons } from "./project-card-buttons"

interface Category {
  id: string
  name: string
}

interface ProjectCardProps {
  id: string
  slug: string
  name: string
  description: string
  logoUrl: string
  upvoteCount: number
  commentCount: number
  launchStatus: string
  launchType?: string | null
  dailyRanking?: number | null
  index?: number
  userHasUpvoted: boolean
  categories: Category[]
  isAuthenticated: boolean
  websiteUrl?: string
  sourceUrl?: string | null
  paperUrl?: string | null
  repoUrl?: string | null
}

export function ProjectCard({
  id,
  slug,
  name,
  description,
  logoUrl,
  upvoteCount,
  commentCount,
  launchStatus,
  index,
  userHasUpvoted,
  categories,
  isAuthenticated,
  websiteUrl,
  paperUrl,
  repoUrl,
}: ProjectCardProps) {
  const router = useRouter()
  const projectPageUrl = `/projects/${slug}`

  return (
    <div
      className="bench-card group cursor-pointer p-3 sm:p-4"
      onClick={(e) => {
        e.stopPropagation()
        router.push(projectPageUrl)
      }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Logo */}
        <div className="flex-shrink-0">
          <div className="relative h-12 w-12 overflow-hidden rounded-lg sm:h-14 sm:w-14">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${name} logo`}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 48px, 56px"
              />
            ) : (
              <span className="text-muted-foreground bg-primary/10 text-primary flex h-full w-full items-center justify-center rounded-lg text-xl font-bold">
                {name.charAt(0)}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-grow">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              {typeof index === "number" && (
                <span className="text-muted-foreground font-mono text-xs">{index + 1}.</span>
              )}
              <Link href={projectPageUrl}>
                <h3 className="group-hover:text-primary line-clamp-1 text-sm font-medium transition-colors sm:text-base">
                  {name}
                </h3>
              </Link>
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary mb-px inline-flex items-center transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                  title={`Visit ${name}`}
                >
                  <RiExternalLinkLine className="hidden h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 md:inline-block" />
                </a>
              )}
            </div>

            <p className="text-muted-foreground mb-1 line-clamp-2 text-xs sm:line-clamp-1 sm:text-sm">
              {description.replace(/<[^>]*>/g, "").trim()}
            </p>

            {/* Tags row */}
            <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              {categories.slice(0, 3).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories?category=${cat.id}`}
                  className="bench-tag hover:bg-primary/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {cat.name}
                </Link>
              ))}
              {/* Quick action links */}
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Source code"
                >
                  <RiGitRepositoryLine className="h-3 w-3" />
                  <span className="hidden sm:inline">repo</span>
                </a>
              )}
              {paperUrl && (
                <a
                  href={paperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="Research paper"
                >
                  <RiFilePaper2Line className="h-3 w-3" />
                  <span className="hidden sm:inline">paper</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Upvote + comments */}
        <ProjectCardButtons
          projectPageUrl={projectPageUrl}
          commentCount={commentCount}
          projectId={id}
          upvoteCount={upvoteCount}
          isAuthenticated={isAuthenticated}
          hasUpvoted={userHasUpvoted}
          launchStatus={launchStatus}
          projectName={name}
        />
      </div>
    </div>
  )
}
