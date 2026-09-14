// React
import { Suspense } from "react"

// App
import { AppShellSkeleton } from "@/components/app-shell-skeleton"
import { SignedInShell } from "@/components/signed-in-shell"

/**
 * Synchronous on purpose: a layout that awaits blocks the whole navigation, and the skeleton below
 * would never be seen. The await happens inside the boundary instead.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <SignedInShell>{children}</SignedInShell>
    </Suspense>
  )
}
