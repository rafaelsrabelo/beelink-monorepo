// React
import { Suspense, type ReactNode } from "react"

// UI
import { DesignEditorSkeleton } from "@harness-monorepo/ui/blocks/design/design-editor-skeleton"

// App
import { requireUser } from "@/lib/session"

/**
 * The design editor's own frame: the whole screen, without the panel's sidebar and header.
 *
 * Signed in like the panel — the proxy sends a visitor with no session to /login before this runs,
 * and `requireUser` holds the line when a session died since. Whose shop it is stays the API's to
 * decide, on every read and write the editor makes, as it is for every screen of the panel.
 */
export default function EditorLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DesignEditorSkeleton />}>
      <SignedIn>{children}</SignedIn>
    </Suspense>
  )
}

async function SignedIn({ children }: { children: ReactNode }) {
  await requireUser()
  return <>{children}</>
}
