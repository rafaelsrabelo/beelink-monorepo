"use client"

// React
import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

/**
 * Whether the person asked their system for less movement. Honouring it is WCAG 2.3.3, and it also
 * makes charts deterministic for screenshots and tests.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    // On the server there is no preference to read; assume none and let the client correct it.
    () => false,
  )
}
