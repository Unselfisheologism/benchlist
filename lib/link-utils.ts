import { LAUNCH_TYPES } from "@/lib/constants"

const launchStatus = {
  PAYMENT_PENDING: "payment_pending",
  PAYMENT_FAILED: "payment_failed",
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

  const isPremiumTier =
    projectInfo.launchType === LAUNCH_TYPES.PREMIUM ||
    projectInfo.launchType === LAUNCH_TYPES.PREMIUM_PLUS

  const isTop3Daily =
    projectInfo.launchStatus === launchStatus.LAUNCHED &&
    projectInfo.dailyRanking !== null &&
    typeof projectInfo.dailyRanking === "number" &&
    projectInfo.dailyRanking >= 1 &&
    projectInfo.dailyRanking <= 3

  if (!isPremiumTier && !isTop3Daily) {
    rel += " nofollow"
  }

  return rel
}
