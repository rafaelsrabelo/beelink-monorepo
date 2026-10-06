// Next
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

// UI
import { Toaster } from "@harness-monorepo/ui/components/sonner"

// App
import { EnvironmentFlag } from "@/components/environment-flag"
import { Providers } from "@/components/providers"
import { getMessages } from "@/lib/locale"
import { serverEnv } from "@/lib/server-env"

import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

const homolog = serverEnv.APP_ENVIRONMENT === "homolog"

export async function generateMetadata(): Promise<Metadata> {
  const { web } = await getMessages()

  return {
    title: web.metadata.title,
    description: web.metadata.description,
    // A second copy of every shop, made up, competing in a search with the real one.
    ...(homolog ? { robots: { index: false, follow: false } } : {}),
  }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, web } = await getMessages()

  return (
    // suppressHydrationWarning: next-themes writes the theme class before React hydrates.
    <html lang={locale} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      {/*
        suppressHydrationWarning here is about other people's browsers, not our code. Extensions
        write attributes onto <body> before React hydrates — ColorZilla adds `cz-shortcut-listen`,
        Grammarly adds `data-gr-*` — and React reports the difference as a hydration mismatch the
        application cannot prevent or repair.

        It costs almost nothing: the flag covers this element's own attributes and text, one level
        deep, never its children. What is given up is a warning about <body>'s own className, which
        is the static literal on this line.
      */}
      <body suppressHydrationWarning className="min-h-full antialiased">
        {homolog ? <EnvironmentFlag label={web.environment.homolog} /> : null}
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
