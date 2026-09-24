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
