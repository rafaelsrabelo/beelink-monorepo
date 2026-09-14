// React
import type { ReactNode } from "react"

// Next
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

// UI
import { Toaster } from "@harness-monorepo/ui/components/sonner"

// App
import { Providers } from "@/components/providers"
import { getMessages } from "@/lib/locale"

import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
  const { web } = await getMessages()

  return { title: web.metadata.title, description: web.metadata.description }
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale } = await getMessages()

  return (
    // suppressHydrationWarning: next-themes writes the theme class before React hydrates.
    <html lang={locale} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
