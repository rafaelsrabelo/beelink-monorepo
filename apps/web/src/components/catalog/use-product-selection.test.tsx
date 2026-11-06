// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { useProductSelection } from "./use-product-selection"

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
}

function answer(status: number, body: unknown) {
  const fetch = vi.fn(async () => Response.json(body, { status }))
  vi.stubGlobal("fetch", fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useProductSelection", () => {
  it("keeps what was chosen on one page while another page is ticked whole", () => {
    const { result, rerender } = renderHook(({ page }) => useProductSelection("lessari", page), {
      wrapper,
      initialProps: { page: ["a", "b"] },
    })

    act(() => result.current.selection.onTogglePage(true))
    rerender({ page: ["c", "d"] })
    act(() => result.current.selection.onTogglePage(true))
    act(() => result.current.selection.onToggle("d", false))

    expect([...result.current.selection.ids]).toEqual(["a", "b", "c"])
    expect(result.current.count).toBe(3)
  })

  it("puts every chosen product in the status asked, in one request, and empties the choice", async () => {
    const fetch = answer(200, { changed: 2 })
    const { result } = renderHook(() => useProductSelection("lessari", ["a", "b"]), { wrapper })

    act(() => result.current.selection.onTogglePage(true))
    act(() => result.current.apply("ACTIVE"))

    await waitFor(() => expect(result.current.count).toBe(0))
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("/api/stores/lessari/products/status")
    expect(JSON.parse(String(init.body))).toEqual({ ids: ["a", "b"], status: "ACTIVE" })
  })

  it("keeps the choice when the change is refused, with the code to explain it", async () => {
    answer(404, { statusCode: 404, errorCode: "PRODUCT_NOT_FOUND", message: "gone" })
    const { result } = renderHook(() => useProductSelection("lessari", ["a"]), { wrapper })

    act(() => result.current.selection.onToggle("a", true))
    act(() => result.current.apply("DRAFT"))

    await waitFor(() => expect(result.current.error).toMatchObject({ errorCode: "PRODUCT_NOT_FOUND" }))
    expect(result.current.count).toBe(1)

    act(() => result.current.forget("a"))
    expect(result.current.count).toBe(0)
  })
})
