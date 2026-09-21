import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Testing Library only auto-cleans when the runner injects a global afterEach; globals are off here.
afterEach(() => {
  cleanup();
});

/**
 * Everything below patches a browser that jsdom only half implements, so none of it applies to a
 * test that declares `@vitest-environment node` — and reaching for `window` there throws before a
 * single test runs. A server-rendering test is exactly the kind that needs no browser, and is
 * exactly the kind this package was missing when a top-level `leaflet` import broke SSR.
 */
if (typeof window !== "undefined") {
  // jsdom implements no layout, so the APIs these primitives reach for are missing rather than broken.
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
  });

  globalThis.ResizeObserver ??= class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver;

  Element.prototype.scrollIntoView ??= vi.fn();
  Element.prototype.hasPointerCapture ??= vi.fn(() => false);
  Element.prototype.setPointerCapture ??= vi.fn();
  Element.prototype.releasePointerCapture ??= vi.fn();
}
