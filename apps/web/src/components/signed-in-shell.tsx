// React
import type { ReactNode } from "react"

// App
import { AppShell } from "@/components/app-shell"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"

/** Everything that has to wait on the API lives here, inside the layout's Suspense boundary. */
export async function SignedInShell({ children }: { children: ReactNode }) {
  const user = await requireUser()
  const { locale, ui, web } = await getMessages()

  return (
    <AppShell user={user} ui={ui} web={web} locale={locale}>
      {children}
    </AppShell>
  )
}
