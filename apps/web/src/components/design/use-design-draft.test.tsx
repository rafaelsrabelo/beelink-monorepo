// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { Section } from "@harness-monorepo/contracts"

// App
import { useDesignDraft } from "./use-design-draft"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

/** A band hidden with its one block hidden too — what two eyes on one card could leave behind. */
const hidden: Section[] = [
  {
    id: "b1",
    name: null,
    width: "CONTAINED",
    background: null,
    position: 0,
    isActive: false,
    components: [
      {
        id: "c1",
        sectionId: "b1",
        kind: "HEADING",
        title: "Oi",
        subtitle: null,
        body: null,
        span: "FULL",
        display: null,
        source: null,
        sourceCategoryId: null,
        limit: null,
        items: [],
        columns: null,
        align: null,
        visibleOn: "ALL",
        position: 0,
        isActive: false,
        createdAt: "2026-09-24T00:00:00.000Z",
        updatedAt: "2026-09-24T00:00:00.000Z",
      },
    ],
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-09-24T00:00:00.000Z",
  },
]

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useDesignDraft — two edits in one click", () => {
  // A single-block card shows its band and its block in one click; the second edit used to undo the first.
  it("keeps both when a band and its block are shown in the same event", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify(hidden), { status: 200 })))
    const { result } = renderHook(() => useDesignDraft("loja"), { wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(1))

    act(() => {
      result.current.patchSection("b1", { isActive: true })
      result.current.patchComponent("c1", { isActive: true })
    })

    expect(result.current.rows[0]).toMatchObject({ isActive: true, components: [{ id: "c1", isActive: true }] })
    expect(result.current.changed).toBe(true)
  })
})

describe("useDesignDraft — the Layout tab's changes wait for Publicar", () => {
  it("holds a format, a column count and an alignment in the draft, and publishes them", async () => {
    const calls: { method: string; body: unknown }[] = []
    vi.stubGlobal("fetch", (_path: string, init: RequestInit) => {
      calls.push({ method: init.method ?? "GET", body: init.body ? JSON.parse(String(init.body)) : null })
      return Promise.resolve(new Response(JSON.stringify(init.method === "PATCH" ? hidden[0]!.components[0] : hidden), { status: 200 }))
    })
    const { result } = renderHook(() => useDesignDraft("loja"), { wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(1))

    act(() => result.current.patchComponent("c1", { columns: 4, align: "RIGHT" }))
    expect(result.current.changeCount).toBe(1)
    act(() => result.current.publish())

    await waitFor(() => expect(calls.find((call) => call.method === "PATCH")).toBeDefined())
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({
      span: "FULL",
      isActive: false,
      columns: 4,
      align: "RIGHT",
      visibleOn: "ALL",
    })
  })
})

// Another tab published an alignment while this one sat untouched: nothing here to publish, nothing to undo.
describe("useDesignDraft — a clean draft follows the server", () => {
  it("takes another tab's published layout instead of offering to put the old one back", async () => {
    let served: Section[] = hidden
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify(served), { status: 200 })))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useDesignDraft("loja"), {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    })
    await waitFor(() => expect(result.current.rows).toHaveLength(1))

    served = [{ ...hidden[0]!, components: [{ ...hidden[0]!.components[0]!, align: "LEFT" }] }]
    await act(() => client.invalidateQueries())

    await waitFor(() => expect(result.current.rows[0]?.components[0]?.align).toBe("LEFT"))
    expect(result.current.changeCount).toBe(0)
  })
})

// A landing is its own page: its bands are asked for by its id, and a draft one goes up after Publicar.
describe("useDesignDraft — one page of the shop", () => {
  it("reads the named page's bands, and runs what Publicar hands it once everything has landed", async () => {
    const paths: string[] = []
    vi.stubGlobal("fetch", (path: string, init: RequestInit) => {
      paths.push(`${init.method ?? "GET"} ${path}`)
      return Promise.resolve(new Response(JSON.stringify(init.method === "PATCH" ? hidden[0]!.components[0] : hidden), { status: 200 }))
    })
    const { result } = renderHook(() => useDesignDraft("loja", "page-1"), { wrapper })
    await waitFor(() => expect(result.current.rows).toHaveLength(1))
    expect(paths[0]).toBe("GET /api/stores/loja/sections?pageId=page-1")

    const onPublished = vi.fn()
    act(() => result.current.publish(onPublished))
    // Nothing arranged to send: what comes after Publicar still runs.
    await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(1))

    act(() => result.current.patchComponent("c1", { columns: 4 }))
    act(() => result.current.publish(onPublished))
    await waitFor(() => expect(onPublished).toHaveBeenCalledTimes(2))
    expect(paths.some((path) => path.startsWith("PATCH /api/stores/loja/components/c1"))).toBe(true)
  })
})
