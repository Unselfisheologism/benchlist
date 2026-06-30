import type { Metadata } from "next"
import { Space_Grotesk as FontHeading, Inter as FontSans } from "next/font/google"

import { Toaster } from "sonner"

import Footer from "@/components/layout/footer"
import Nav from "@/components/layout/nav"
import { ThemeProvider } from "@/components/theme/theme-provider"

import "./globals.css"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontHeading = FontHeading({
  subsets: ["latin"],
  variable: "--font-heading",
})

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://benchlist.dev"),
  title: "Benchlist — The AI Benchmark Directory",
  description:
    "Benchlist is the open directory of AI model benchmarks. Discover, track, and compare SWE-Bench, HLE, ARC-AGI, MMLU, and hundreds more.",
  openGraph: {
    title: "Benchlist — The AI Benchmark Directory",
    description:
      "The open directory of AI model benchmarks. Discover, track, and compare every public benchmark.",
    url: process.env.NEXT_PUBLIC_URL,
    siteName: "Benchlist",
    images: [
      {
        url: "og.png",
        width: 1200,
        height: 630,
        alt: "Benchlist — The AI Benchmark Directory",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Benchlist — The AI Benchmark Directory",
    description:
      "The open directory of AI model benchmarks. Discover, track, and compare every public benchmark.",
    images: ["og.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans antialiased ${fontSans.variable} ${fontHeading.variable} sm:overflow-y-scroll`}
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="flex min-h-dvh flex-col">
            <Nav />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
