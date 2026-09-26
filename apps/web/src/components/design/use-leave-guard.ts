"use client"

// React
import { useEffect, useRef, useState, type MouseEvent } from "react"

// Next
import { useRouter } from "next/navigation"

/** Where "Sair sem publicar" goes when the way out was the browser's Back rather than a link. */
const BACK = "back"

/**
 * Asks before the editor is left with a change still on its way to the draft — the one owner of
 * that question, so there is one rule (`changed`) for when it is asked.
 *
 * Three doors. The page's own way out ("← Painel") is stopped and asked in the page's dialog; a
 * click that opens it in another tab is not leaving, and passes. The browser's Back is caught by a
 * step pushed onto the history at the same address — native `pushState`, which the app router
 * adopts — so Back lands on it and asks instead. Closing or reloading the tab can only be asked by
 * the browser, through `beforeunload`, whose wording no page may choose.
 */
export function useLeaveGuard(changed: boolean) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    if (!changed) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [changed])

  /*
    The step Back lands on is pushed once, the first time something is waiting — and not again on
    every save: with changes saved as they are made, `changed` comes and goes with each one, and a
    step per save left Back needing a press per edit to leave. While the step is there, Back asks if
    something is still waiting and otherwise simply goes on back, past it.
  */
  const waiting = useRef(changed)
  const stepped = useRef(false)

  useEffect(() => {
    waiting.current = changed
  }, [changed])

  useEffect(() => {
    if (!changed || stepped.current) return
    stepped.current = true
    window.history.pushState(window.history.state, "", window.location.href)
  }, [changed])

  useEffect(() => {
    const onBack = () => {
      if (!stepped.current) return
      if (waiting.current) {
        window.history.pushState(window.history.state, "", window.location.href)
        setPending(BACK)
      } else {
        stepped.current = false
        window.history.back()
      }
    }
    window.addEventListener("popstate", onBack)
    return () => window.removeEventListener("popstate", onBack)
  }, [])

  return {
    onLeave: (event: MouseEvent<HTMLAnchorElement>) => {
      const newTab = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
      if (!changed || newTab) return
      event.preventDefault()
      setPending(event.currentTarget.getAttribute("href"))
    },
    /** A way out the screen takes itself, after a create: asked the same question when there is one to ask. */
    go: (href: string) => {
      if (changed) setPending(href)
      else router.push(href as Parameters<typeof router.push>[0])
    },
    asking: pending !== null,
    stay: () => setPending(null),
    leave: () => {
      setPending(null)
      // Back past the step this guard pushed and the page itself.
      if (pending === BACK) window.history.go(-2)
      else if (pending) router.push(pending as Parameters<typeof router.push>[0])
    },
  }
}
