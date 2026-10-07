"use client"

// React
import { useState } from "react"
import type { ReactNode } from "react"

// Libs
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"

// App
import { isPanelPage, isSignedOutError, sessionEndedHrefOf } from "@/lib/panel-return"

/**
 * A panel call that says the session is over sends the person to sign in, and back to this page
 * after (BEELINK-169). The proxy renews a session whose refresh still holds, so by here it does not.
 * A shop window is left alone: its shopper browses on, signed out.
 */
function signInWhenSignedOut(error: unknown): void {
  if (typeof window === "undefined" || !isSignedOutError(error) || !isPanelPage(window.location.pathname)) return
  window.location.assign(sessionEndedHrefOf(window.location.pathname + window.location.search))
}

/** Exported for the tests of what an ended session does to a query that reads on a clock. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: signInWhenSignedOut }),
    mutationCache: new MutationCache({ onError: signInWhenSignedOut }),
    // Asking again cannot bring an ended session back; anything else gets TanStack's three tries.
    defaultOptions: { queries: { staleTime: 60_000, retry: (failures, error) => !isSignedOutError(error) && failures < 3 } },
  })
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
