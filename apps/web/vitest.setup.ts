import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

afterEach(() => {
  cleanup()
})

/**
 * The browser APIs jsdom leaves out and a carousel reaches for the moment it mounts — the same three
 * `packages/ui`'s setup patches. A screen that draws the landing page draws the ui's carousel with
 * it, so a test of that screen failed on Embla rather than on anything the screen does.
 */
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })

  globalThis.ResizeObserver ??= class {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  } as unknown as typeof ResizeObserver

  globalThis.IntersectionObserver ??= class {
    root = null
    rootMargin = ""
    thresholds = []
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn(() => [])
  } as unknown as typeof IntersectionObserver
}
