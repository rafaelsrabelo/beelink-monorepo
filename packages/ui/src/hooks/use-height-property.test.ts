// Libs
import { renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Hook
import { useHeightProperty } from "./use-height-property"

class Observer {
  static last: Observer | null = null
  constructor(readonly callback: () => void) {
    Observer.last = this
  }
  observe = vi.fn()
  disconnect = vi.fn()
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.style.removeProperty("--test-height")
})

function elementOf(height: number): { current: HTMLElement } {
  const node = document.createElement("div")
  Object.defineProperty(node, "offsetHeight", { configurable: true, get: () => height })
  return { current: node }
}

describe("useHeightProperty", () => {
  it("says the element's height on the document, again on a resize, and takes it back when gone", () => {
    vi.stubGlobal("ResizeObserver", Observer)
    const element = elementOf(120)
    const { unmount } = renderHook(() => useHeightProperty(element, "--test-height"))
    expect(document.documentElement.style.getPropertyValue("--test-height")).toBe("120px")

    Object.defineProperty(element.current, "offsetHeight", { get: () => 160 })
    Observer.last!.callback()
    expect(document.documentElement.style.getPropertyValue("--test-height")).toBe("160px")

    unmount()
    expect(document.documentElement.style.getPropertyValue("--test-height")).toBe("")
    expect(Observer.last!.disconnect).toHaveBeenCalled()
  })

  it("says nothing while it is off", () => {
    vi.stubGlobal("ResizeObserver", Observer)
    renderHook(() => useHeightProperty(elementOf(80), "--test-height", false))
    expect(document.documentElement.style.getPropertyValue("--test-height")).toBe("")
  })
})
