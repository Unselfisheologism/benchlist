import Link from "next/link"

import { RiGithubFill, RiTwitterXFill } from "@remixicon/react"

const discoverLinks = [
  { title: "Trending Benchmarks", href: "/trending" },
  { title: "All Benchmarks", href: "/categories" },
  { title: "Submit Benchmark", href: "/projects/submit" },
]

const resourcesLinks = [
  { title: "Blog", href: "/blog" },
  { title: "Pricing", href: "/pricing" },
]

const legalLinks = [
  { title: "Terms of Service", href: "/legal/terms" },
  { title: "Privacy Policy", href: "/legal/privacy" },
]

const connectLinkItems = [
  {
    href: "https://github.com/open-launch/benchlist",
    icon: RiGithubFill,
    label: "GitHub",
  },
  {
    href: "https://twitter.com/openlaunchdev",
    icon: RiTwitterXFill,
    label: "Twitter / X",
  },
]

export default function FooterSection() {
  return (
    <footer className="bg-background border-t pt-8 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-12">
          {/* Brand column */}
          <div className="flex flex-col items-start text-left md:col-span-5">
            <Link href="/" className="font-heading mb-3 flex items-center">
              <span className="font-heading flex items-center text-lg font-bold tracking-tight">
                <span className="bg-primary text-primary-foreground mr-1.5 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black">
                  B
                </span>
                Benchlist
              </span>
            </Link>
            <p className="text-muted-foreground max-w-sm text-sm">
              The open directory of AI model benchmarks. Discover, track, and compare every public
              benchmark — from SWE-Bench to ARC-AGI and beyond.
            </p>
            <p className="text-muted-foreground mt-3 text-xs">
              © {new Date().getFullYear()} Benchlist. Open source.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
            <div className="text-left">
              <h3 className="text-foreground text-sm font-semibold tracking-wider uppercase">
                Directory
              </h3>
              <ul role="list" className="mt-4 flex flex-col items-start space-y-3">
                {discoverLinks.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-primary text-sm transition-colors duration-150"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-left">
              <h3 className="text-foreground text-sm font-semibold tracking-wider uppercase">
                Resources
              </h3>
              <ul role="list" className="mt-4 flex flex-col items-start space-y-3">
                {resourcesLinks.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-primary text-sm transition-colors duration-150"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
                {connectLinkItems.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-sm transition-colors duration-150"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-left">
              <h3 className="text-foreground text-sm font-semibold tracking-wider uppercase">
                Legal
              </h3>
              <ul role="list" className="mt-4 flex flex-col items-start space-y-3">
                {legalLinks.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-primary text-sm transition-colors duration-150"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
