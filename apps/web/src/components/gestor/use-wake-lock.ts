"use client"

// React
import { useEffect } from "react"

/**
 * Keeps the screen on while `active` — the counter left open on a tablet must not go dark between
 * orders. A browser lets the lock go when the tab is hidden, so it is asked again on the way back.
 * A refusal — a battery saver, a browser without the API — leaves the screen to its own clock.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return
    let lock: WakeLockSentinel | null = null
    let done = false

    const request = async () => {
      try {
        const granted = await navigator.wakeLock.request("screen")
        if (done) void granted.release()
        else lock = granted
      } catch {
        lock = null
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void request()
    }

    void request()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      done = true
      document.removeEventListener("visibilitychange", onVisible)
      void lock?.release()
    }
  }, [active])
}
