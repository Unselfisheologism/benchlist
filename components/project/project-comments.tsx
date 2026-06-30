"use client"

import { cn } from "@/lib/utils"

interface ProjectCommentsProps {
  projectId: string
  className?: string
}

export function ProjectComments(props: ProjectCommentsProps) {
  return (
    <div className={cn("relative z-10 mt-8", props.className)}>
      <div className="bg-background rounded-lg border p-6 text-center">
        <p className="text-muted-foreground text-sm">Comments coming soon.</p>
      </div>
    </div>
  )
}
