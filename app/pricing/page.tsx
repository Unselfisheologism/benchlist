/* eslint-disable @next/next/no-img-element */
import Link from "next/link"

import { RiCheckboxCircleFill } from "@remixicon/react"

import { LAUNCH_LIMITS, LAUNCH_SETTINGS } from "@/lib/constants"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Pricing - Benchlist",
  description: "Submit your project to Benchlist for free",
}

export default function PricingPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
      <div className="mb-4 text-center">
        <h1 className="mb-3 text-2xl font-bold sm:text-3xl">Submit Your Project</h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-sm">
          Benchlist is free and open. Submit any public AI benchmark or tool to the directory. All
          launches happen at 8:00 AM UTC.
        </p>
      </div>

      <div className="mx-auto mb-12 max-w-lg">
        <div className="rounded-lg border p-5">
          <div className="mb-4">
            <h5 className="mb-2 text-base font-medium">Free Launch</h5>
            <div className="mb-2 text-2xl font-bold">
              $0 <span className="text-muted-foreground text-sm font-normal">/launch</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Standard launch with up to {LAUNCH_SETTINGS.MAX_DAYS_AHEAD} days scheduling window.
            </p>
          </div>

          <ul className="mb-5 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <RiCheckboxCircleFill className="text-primary h-4 w-4" />
              <span>{LAUNCH_LIMITS.FREE_DAILY_LIMIT} slots available daily</span>
            </li>
            <li className="flex items-center gap-2">
              <RiCheckboxCircleFill className="text-primary h-4 w-4" />
              <span>Standard launch queue</span>
            </li>
            <li className="flex items-center gap-2">
              <RiCheckboxCircleFill className="text-primary h-4 w-4" />
              <span>Featured on homepage</span>
            </li>
          </ul>

          <Button size="sm" className="w-full" asChild>
            <Link href="/projects/submit">Launch for Free</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
