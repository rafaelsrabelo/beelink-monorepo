// Libs
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import { useDraftRevision } from "@/stores/draft-revision"
import { createSectionRow, updateComponent } from "./page-requests"
import { publishPage } from "./store-page-requests"

/** Every request, answered as given, remembered with the revision it named. */
function answer(status = 200, body: unknown = { id: "s1", components: [] }) {
  const sent: { url: string; revision: string | null }[] = []
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    sent.push({ url, revision: (init?.headers as Record<string, string>)["x-page-revision"] ?? null })
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }))
  })
  return sent
}

beforeEach(() => {
  useDraftRevision.setState({ cursors: {}, stale: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("draftWrite — one page's draft, one write at a time", () => {
  it("names the revision this tab read, and the next one after each write lands", async () => {
    useDraftRevision.getState().saw("loja", { pageId: "p1", revision: 3 })
    const sent = answer(201)

    // A row of two banners: the band, then the second banner into it — in order, 3 then 4.
    await createSectionRow("loja", { component: { kind: "BANNER" } }, 1)

    expect(sent.map((request) => request.revision)).toEqual(["3", "4"])
    expect(useDraftRevision.getState().cursors["loja"]).toEqual({ pageId: "p1", revision: 5 })
  })

  it("names none before the draft was read, and learns nothing from it", async () => {
    const sent = answer()

    await updateComponent("loja", "c1", { title: "Oi" })

    expect(sent[0]!.revision).toBeNull()
    expect(useDraftRevision.getState().cursors["loja"]).toBeUndefined()
  })

  it("tells the editor to reload when another tab wrote first", async () => {
    useDraftRevision.getState().saw("loja", { pageId: "p1", revision: 3 })
    answer(409, { errorCode: "PAGE_DRAFT_STALE" })

    await expect(updateComponent("loja", "c1", { title: "Oi" })).rejects.toMatchObject({ errorCode: "PAGE_DRAFT_STALE" })

    expect(useDraftRevision.getState().stale).toBe(true)
    expect(useDraftRevision.getState().cursors["loja"]!.revision).toBe(3)
  })

  it("publishes the draft this tab saw, which leaves the revision where it was", async () => {
    useDraftRevision.getState().saw("loja", { pageId: "p1", revision: 7 })
    const sent = answer(201, { page: {}, version: {} })

    await publishPage("loja", "p1")

    expect(sent[0]!.revision).toBe("7")
    expect(useDraftRevision.getState().cursors["loja"]!.revision).toBe(7)
  })

  it("never goes back to a revision a slower read answered with, and follows another tab's further one", () => {
    const { saw } = useDraftRevision.getState()
    saw("loja", { pageId: "p1", revision: 5 })
    saw("loja", { pageId: "p1", revision: 4 })
    expect(useDraftRevision.getState().cursors["loja"]!.revision).toBe(5)

    saw("loja", { pageId: "p1", revision: 9 })
    saw("loja", { pageId: "p2", revision: 1 })
    expect(useDraftRevision.getState().cursors["loja"]).toEqual({ pageId: "p2", revision: 1 })
  })
})
