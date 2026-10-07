"use client"

// React
import { useEffect, useRef } from "react"

// Types
import type { PopupTrigger } from "@harness-monorepo/contracts"

/** On a phone, "about to leave" is read as this much of the page scrolled… */
export const POPUP_LEAVE_SCROLL_SHARE = 0.5
/** …or this long on it, whichever comes first. The panel's screen says both numbers to the shopkeeper. */
export const POPUP_LEAVE_TOUCH_SECONDS = 30
/** How often a pop-up that found the visitor busy looks again. */
export const POPUP_BUSY_RETRY_MS = 1000

export interface PopupTriggerAsk {
  trigger: PopupTrigger
  /** Seconds after it is armed, on `ON_ARRIVAL`. */
  delaySeconds: number
  /** False holds everything: nothing is listened to and no clock runs. Armed again, the wait starts over. */
  armed: boolean
  onFire: () => void
}

/** A device whose pointer can leave the page: a mouse or a trackpad. A finger cannot. */
const CAN_LEAVE = "(hover: hover) and (pointer: fine)"
/** Something already holding the visitor: an open dialog or drawer — the menu, the search. */
const MODAL_OPEN = '[aria-modal="true"], [role="dialog"][data-open], [role="dialog"][data-state="open"], [role="alertdialog"]'

/** Whether opening now would interrupt: another dialog is up, or the visitor is typing. */
function busy(): boolean {
  if (document.querySelector(MODAL_OPEN)) return true
  const focused = document.activeElement
  return focused instanceof HTMLElement && (focused.matches("input, textarea, select") || focused.isContentEditable)
}

/**
 * When a shop's pop-up opens (BEELINK-306), once.
 *
 * `ON_ARRIVAL` waits its seconds. `ON_LEAVE` waits for the pointer to leave through the top of the
 * window — on its way to the tabs or the address bar. A phone has no pointer to leave with, so
 * there the same choice is read as half the page scrolled or half a minute on it, whichever comes
 * first: the nearest thing to "has seen the shop and may go".
 *
 * It never interrupts. If, when its moment comes, another dialog is open or the visitor is typing
 * in a field, it looks again every second until neither is true.
 *
 * It fires once per arming, and stops listening when it does.
 */
export function usePopupTrigger({ trigger, delaySeconds, armed, onFire }: PopupTriggerAsk): void {
  // The latest callback, without re-arming the wait each time the screen draws.
  const fire = useRef(onFire)
  useEffect(() => {
    fire.current = onFire
  })

  useEffect(() => {
    if (!armed) return

    let fired = false
    const timers: number[] = []
    const stops: (() => void)[] = []
    const stop = () => {
      for (const timer of timers) window.clearTimeout(timer)
      for (const off of stops) off()
    }
    const open = () => {
      if (fired) return
      if (busy()) {
        timers.push(window.setTimeout(open, POPUP_BUSY_RETRY_MS))
        return
      }
      fired = true
      stop()
      fire.current()
    }
    const after = (seconds: number) => timers.push(window.setTimeout(open, seconds * 1000))

    if (trigger === "ON_ARRIVAL") {
      after(delaySeconds)
    } else if (window.matchMedia(CAN_LEAVE).matches) {
      // Out of the document with nowhere to go to, at the top edge: not a move onto another element.
      const leaving = (event: MouseEvent) => {
        if (event.relatedTarget === null && event.clientY <= 0) open()
      }
      document.addEventListener("mouseout", leaving)
      stops.push(() => document.removeEventListener("mouseout", leaving))
    } else {
      const scrolled = () => {
        const room = document.documentElement.scrollHeight - window.innerHeight
        if (room > 0 && window.scrollY / room >= POPUP_LEAVE_SCROLL_SHARE) open()
      }
      window.addEventListener("scroll", scrolled, { passive: true })
      stops.push(() => window.removeEventListener("scroll", scrolled))
      after(POPUP_LEAVE_TOUCH_SECONDS)
    }

    return stop
  }, [armed, trigger, delaySeconds])
}
