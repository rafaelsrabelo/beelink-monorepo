// React
import type { ReactNode } from "react"

// Next
import { cookies } from "next/headers"

// App
import { AppShell } from "@/components/app-shell"
import { getMessages } from "@/lib/locale"
import { PREFS_COOKIE, parsePrefs } from "@/lib/prefs"
import { requireUser } from "@/lib/session"

/** Everything that has to wait on the API lives here, inside the layout's Suspense boundary. */
export async function SignedInShell({ children }: { children: ReactNode }) {
  const user = await requireUser()
  // Both reads are already paid for on this path, so they go together rather than in series.
  const [{ locale, ui, web }, jar] = await Promise.all([getMessages(), cookies()])
  // Read here and not in `lib/prefs.ts`: that module is imported by the Client Component that
  // writes the cookie, and a module reaching for `next/headers` cannot be imported from one.
  const prefs = parsePrefs(jar.get(PREFS_COOKIE)?.value)

  return (
    <AppShell user={user} ui={ui} web={web} locale={locale} prefs={prefs}>
      {children}
    </AppShell>
  )
}
