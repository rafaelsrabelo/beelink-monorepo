"use client"

// React
import { useEffect, useState, type MouseEvent } from "react"

// Next
import { useRouter } from "next/navigation"

/**
 * Asks before the editor is left with an arrangement nobody published.
 *
 * Two doors, two askers: the page's own way out ("← Painel") is stopped and asked in the page's
 * dialog; closing or reloading the tab can only be asked by the browser, through `beforeunload`,
 * whose wording no page may choose.
 */
export function useLeaveGuard(changed: boolean) {
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    if (!changed) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [changed])

  return {
    onLeave: (event: MouseEvent<HTMLAnchorElement>) => {
      if (!changed) return
      event.preventDefault()
      setPendingHref(event.currentTarget.getAttribute("href"))
    },
    asking: pendingHref !== null,
    stay: () => setPendingHref(null),
    leave: () => {
      setPendingHref(null)
      if (pendingHref) router.push(pendingHref as Parameters<typeof router.push>[0])
    },
  }
}
