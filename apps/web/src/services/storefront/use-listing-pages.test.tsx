// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { ListingPage } from "@/lib/listing-pages"

// App
import { useListingPages } from "./storefront-hooks"

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

const card = (id: string) => ({ id, slug: id, name: id, priceCents: 100 }) as unknown as ListingPage["products"][number]
const first: ListingPage = { products: [card("a"), card("b")], page: 1, pageSize: 2, total: 5 }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useListingPages", () => {
  it("starts from the server's page and asks for the next ones, with the shelf's own question", async () => {
    const fetch = vi.fn(async () => Response.json({ products: [card("c"), card("d")], page: 2, pageSize: 2, total: 5 } satisfies ListingPage))
    vi.stubGlobal("fetch", fetch)
    const { result } = renderHook(() => useListingPages("dindin-da-leia", "categoria=dindins&porPagina=2", first), { wrapper })

    expect(result.current.data?.pages).toHaveLength(1)
    expect(result.current.hasNextPage).toBe(true)

    await act(() => result.current.fetchNextPage())

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(fetch).toHaveBeenCalledWith("/api/storefront/dindin-da-leia/catalog?categoria=dindins&porPagina=2&pagina=2", expect.anything())
  })

  it("stops at the shelf's end", () => {
    const { result } = renderHook(() => useListingPages("dindin-da-leia", "", { ...first, total: 2 }), { wrapper })

    expect(result.current.hasNextPage).toBe(false)
  })
})
