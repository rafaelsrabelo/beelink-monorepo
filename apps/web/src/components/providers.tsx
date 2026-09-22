"use client"

// React
import { useState } from "react"
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"

function makeQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient(): QueryClient {
  // A fresh client per server render; one for the whole browser session.
  if (typeof window === "undefined") return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {/*
        Pinned to light, and the provider stays mounted.

        Dark mode here was never chosen by anyone: it is entirely OS-driven and there is no toggle
        anywhere in the product. Nobody drew the panel dark, and on the storefront it is actively
        wrong — a dark OS puts `.dark` on <html> and repaints the primitives nested inside a shop's
        own light-by-data palette. Removing the provider would not help: Toaster falls back to
        `theme="system"` and resolves dark by media query on its own. One prop, reversible in one
        line, the day a designer draws it.
      */}
      <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
