// React
import { Suspense, type ReactNode } from "react"

// UI
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// App
import { requireUser } from "@/lib/session"

/**
 * The order manager's own frame (plan 2026-11-10--modo-gestor): the whole screen, without the
 * panel's sidebar and header — the manager draws its own.
 *
 * Signed in like the panel: the proxy sends a visitor with no session to /login before this runs,
 * and `requireUser` holds the line when a session died since. Whose shop it is stays the API's to
 * decide, on every read and write the manager makes.
 */
export default function GestorLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<GestorLayoutSkeleton />}>
      <SignedIn>{children}</SignedIn>
    </Suspense>
  )
}

async function SignedIn({ children }: { children: ReactNode }) {
  await requireUser()
  return <>{children}</>
}

function GestorLayoutSkeleton() {
  return (
    <div className="bg-shell-content flex min-h-svh flex-col lg:flex-row">
      <div className="bg-shell flex flex-col gap-4 p-4 lg:w-60">
        <Skeleton className="h-11 w-40" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-5 px-4 py-5 lg:px-7 lg:py-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  )
}
