// Libs
import { render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { PopupTrigger } from "@harness-monorepo/contracts"

// App
import { POPUP_LEAVE_SCROLL_SHARE, POPUP_LEAVE_TOUCH_SECONDS, usePopupTrigger } from "./use-popup-trigger"

const onFire = vi.fn()

function Trigger({ trigger = "ON_ARRIVAL" as PopupTrigger, delaySeconds = 5, armed = true }) {
  usePopupTrigger({ trigger, delaySeconds, armed, onFire })
  return null
}

/** A device with a pointer that can leave the page, or one with a finger. */
function device(kind: "mouse" | "touch") {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: kind === "mouse" && query.includes("hover: hover"), media: query, addEventListener: () => {}, removeEventListener: () => {} }))
}

/** The pointer going out of the document at `y`, towards `to` — null is out of the window. */
function mouseOut(y: number, to: Element | null = null) {
  document.dispatchEvent(new MouseEvent("mouseout", { clientY: y, relatedTarget: to, bubbles: true }))
}

/** The page scrolled to a share of what it can scroll. */
function scrollTo(share: number, pageHeight = 3000, windowHeight = 800) {
  Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: pageHeight })
  Object.defineProperty(window, "innerHeight", { configurable: true, value: windowHeight })
  Object.defineProperty(window, "scrollY", { configurable: true, value: (pageHeight - windowHeight) * share })
  window.dispatchEvent(new Event("scroll"))
}

beforeEach(() => {
  vi.useFakeTimers()
  onFire.mockReset()
  device("mouse")
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ""
})

describe("usePopupTrigger", () => {
  describe("on arrival", () => {
    it("fires after its seconds, and not a moment before", () => {
      render(<Trigger delaySeconds={5} />)

      vi.advanceTimersByTime(4999)
      expect(onFire).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(onFire).toHaveBeenCalledOnce()
    })

    it("fires at once with no delay, and only once however long the page lives", () => {
      render(<Trigger delaySeconds={0} />)

      vi.advanceTimersByTime(0)
      expect(onFire).toHaveBeenCalledOnce()
      vi.advanceTimersByTime(120_000)
      expect(onFire).toHaveBeenCalledOnce()
    })

    it("does not listen for the pointer leaving", () => {
      render(<Trigger delaySeconds={5} />)

      mouseOut(-1)
      expect(onFire).not.toHaveBeenCalled()
    })
  })

  describe("on leaving, with a pointer", () => {
    it("fires when the pointer leaves through the top of the window", () => {
      render(<Trigger trigger="ON_LEAVE" />)

      vi.advanceTimersByTime(120_000)
      expect(onFire).not.toHaveBeenCalled()

      mouseOut(-2)
      expect(onFire).toHaveBeenCalledOnce()
    })

    it("does not fire for a move between elements, nor for the pointer leaving by a side or the bottom", () => {
      render(<Trigger trigger="ON_LEAVE" />)

      mouseOut(0, document.body)
      mouseOut(400)
      mouseOut(900)
      expect(onFire).not.toHaveBeenCalled()
    })

    it("fires once, and stops listening", () => {
      render(<Trigger trigger="ON_LEAVE" />)

      mouseOut(0)
      mouseOut(0)
      expect(onFire).toHaveBeenCalledOnce()
    })
  })

  describe("on leaving, on a phone", () => {
    beforeEach(() => device("touch"))

    it("fires once half the page is scrolled", () => {
      render(<Trigger trigger="ON_LEAVE" />)

      scrollTo(POPUP_LEAVE_SCROLL_SHARE - 0.05)
      expect(onFire).not.toHaveBeenCalled()
      scrollTo(POPUP_LEAVE_SCROLL_SHARE)
      expect(onFire).toHaveBeenCalledOnce()
    })

    it("fires after half a minute on the page with no scroll at all", () => {
      render(<Trigger trigger="ON_LEAVE" />)

      vi.advanceTimersByTime(POPUP_LEAVE_TOUCH_SECONDS * 1000 - 1)
      expect(onFire).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(onFire).toHaveBeenCalledOnce()
    })

    it("fires once, whichever came first", () => {
      render(<Trigger trigger="ON_LEAVE" />)

      scrollTo(0.8)
      vi.advanceTimersByTime(POPUP_LEAVE_TOUCH_SECONDS * 1000)
      scrollTo(0.9)
      expect(onFire).toHaveBeenCalledOnce()
    })

    it("does not take a page too short to scroll for one scrolled to its end", () => {
      render(<Trigger trigger="ON_LEAVE" />)

      scrollTo(0, 600, 800)
      expect(onFire).not.toHaveBeenCalled()
    })

    it("ignores a pointer: a finger has none to leave with", () => {
      render(<Trigger trigger="ON_LEAVE" />)

      mouseOut(-1)
      expect(onFire).not.toHaveBeenCalled()
    })
  })

  describe("while it is not armed", () => {
    it("runs no clock and listens to nothing", () => {
      render(<Trigger armed={false} delaySeconds={1} />)

      vi.advanceTimersByTime(60_000)
      mouseOut(-1)
      expect(onFire).not.toHaveBeenCalled()
    })

    it("starts its wait over, whole, once armed", () => {
      const view = render(<Trigger armed={false} delaySeconds={5} />)
      vi.advanceTimersByTime(60_000)

      view.rerender(<Trigger armed delaySeconds={5} />)
      vi.advanceTimersByTime(4999)
      expect(onFire).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(onFire).toHaveBeenCalledOnce()
    })

    it("drops a wait under way when it is disarmed", () => {
      const view = render(<Trigger delaySeconds={5} />)
      vi.advanceTimersByTime(3000)

      view.rerender(<Trigger armed={false} delaySeconds={5} />)
      vi.advanceTimersByTime(60_000)
      expect(onFire).not.toHaveBeenCalled()
    })
  })

  describe("never interrupting", () => {
    it("waits while another dialog is open, and fires once it is gone", () => {
      const menu = document.body.appendChild(document.createElement("div"))
      menu.setAttribute("role", "dialog")
      menu.setAttribute("data-open", "")
      render(<Trigger delaySeconds={2} />)

      vi.advanceTimersByTime(10_000)
      expect(onFire).not.toHaveBeenCalled()

      menu.remove()
      vi.advanceTimersByTime(1000)
      expect(onFire).toHaveBeenCalledOnce()
    })

    it("waits while the visitor is typing in a field", () => {
      const search = document.body.appendChild(document.createElement("input"))
      search.focus()
      render(<Trigger delaySeconds={2} />)

      vi.advanceTimersByTime(5000)
      expect(onFire).not.toHaveBeenCalled()

      search.blur()
      vi.advanceTimersByTime(1000)
      expect(onFire).toHaveBeenCalledOnce()
    })
  })

  it("leaves no clock and no listener behind when its page goes", () => {
    const view = render(<Trigger trigger="ON_LEAVE" />)
    view.unmount()

    mouseOut(-1)
    vi.advanceTimersByTime(120_000)
    expect(onFire).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
