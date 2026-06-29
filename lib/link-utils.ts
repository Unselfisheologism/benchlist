const launchStatus = {
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  LAUNCHED: "launched",
} as const

interface ProjectLinkInfo {
  launchType?: string
  launchStatus?: string
  dailyRanking?: number | null
}

export function getProjectWebsiteRelAttribute(projectInfo: ProjectLinkInfo): string {
  let rel = "noopener"

  const isTop3Daily =
    projectInfo.launchStatus === launchStatus.LAUNCHED &&
    projectInfo.dailyRanking !== null &&
    typeof projectInfo.dailyRanking === "number" &&
    projectInfo.dailyRanking >= 1 &&
    projectInfo.dailyRanking <= 3

  if (!isTop3Daily) {
    rel += " nofollow"
  }

  return rel
}
