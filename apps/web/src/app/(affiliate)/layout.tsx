// React
import { Suspense, type ReactNode } from "react"

// UI
import { AffiliateAreaSkeleton } from "@harness-monorepo/ui/blocks/affiliate-area/affiliate-area-skeleton"

// App
import { AffiliateAreaFrame } from "@/components/affiliate-area/affiliate-area-frame"
import { ownedShopCountOf } from "@/lib/account-reach"
import { getMessages } from "@/lib/locale"
import { requireUser } from "@/lib/session"

/**
 * The affiliate's own area (IMPULSEIA-108): signed in with a bee-link account, like the panel — the
 * proxy sends a visitor with no session to /login first — and framed by itself, since it is no shop's
 * panel. Which shops the account sells for, and what it reads of each, is the API's to decide.
 *
 * Synchronous on purpose, as the panel's: the await happens inside the boundary, so the skeleton shows.
 */
export default function AffiliateLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-4xl px-4 py-8">
          <AffiliateAreaSkeleton />
        </div>
      }
    >
      <SignedIn>{children}</SignedIn>
    </Suspense>
  )
}

async function SignedIn({ children }: { children: ReactNode }) {
  const [user, { ui }, owned] = await Promise.all([requireUser(), getMessages(), ownedShopCountOf()])

  return (
    <AffiliateAreaFrame user={{ name: user.name, email: user.email }} panelHref={owned > 0 ? "/admin" : null} messages={ui}>
      {children}
    </AffiliateAreaFrame>
  )
}
