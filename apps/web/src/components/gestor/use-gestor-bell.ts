"use client"

// React
import { useCallback, useEffect, useRef } from "react"

// App
import { createGestorBell, type GestorBell } from "@/lib/gestor-bell"

/** How often the bell rings again while an order waits. */
export const RING_EVERY_MS = 3_000

/**
 * Rings while `ringing`, every few seconds, until it is not — an order accepted or refused, the
 * sound turned off. `unlock` is the browser's permission, called from the tap that opens the counter.
 */
export function useGestorBell(ringing: boolean): { unlock: () => void; test: () => void } {
  const bell = useRef<GestorBell | null>(null)
  const bellOf = useCallback(() => (bell.current ??= createGestorBell()), [])

  useEffect(() => {
    if (!ringing) return
    const ring = () => bellOf().ring()
    ring()
    const timer = window.setInterval(ring, RING_EVERY_MS)
    return () => window.clearInterval(timer)
  }, [ringing, bellOf])

  return {
    unlock: useCallback(() => void bellOf().unlock(), [bellOf]),
    test: useCallback(() => {
      const current = bellOf()
      void current.unlock().then(() => current.ring())
    }, [bellOf]),
  }
}
