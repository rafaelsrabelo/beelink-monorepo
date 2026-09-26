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

/** The editor on page `pageId` of "loja", whose draft read answered `revision`. */
function editing(pageId: string, revision?: number) {
  const store = useDraftRevision.getState()
  store.open("loja", pageId)
  if (revision !== undefined) store.saw(pageId, revision)
}

const revisionOf = (pageId: string) => useDraftRevision.getState().revisions[pageId]

beforeEach(() => {
  useDraftRevision.setState({ editing: {}, revisions: {}, sending: {}, stale: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("draftWrite — the open page's draft, one write at a time", () => {
  it("names the revision this tab read, and the next one after each write lands", async () => {
    editing("p1", 3)
    const sent = answer(201)

    // A row of two banners: the band, then the second banner into it — in order, 3 then 4.
    await createSectionRow("loja", { component: { kind: "BANNER" } }, 1)

    expect(sent.map((request) => request.revision)).toEqual(["3", "4"])
    expect(revisionOf("p1")).toBe(5)
  })

  // Home, then a landing, then back to the home from the cache: the home's writes name the home's revision.
  it("names the open page's revision, never another page's the tab visited before", async () => {
    editing("home", 7)
    editing("landing", 0)
    useDraftRevision.getState().close("loja", "landing")
    editing("home")
    const sent = answer()

    await updateComponent("loja", "c1", { title: "Oi" })

    expect(sent[0]!.revision).toBe("7")
    expect(revisionOf("home")).toBe(8)
    expect(revisionOf("landing")).toBe(0)
  })

  it("names none before the open page's draft was read, and learns nothing from it", async () => {
    editing("p1")
    const sent = answer()

    await updateComponent("loja", "c1", { title: "Oi" })

    expect(sent[0]!.revision).toBeNull()
    expect(revisionOf("p1")).toBeUndefined()
  })

  it("tells the editor to reload when another tab wrote first", async () => {
    editing("p1", 3)
    answer(409, { errorCode: "PAGE_DRAFT_STALE" })

    await expect(updateComponent("loja", "c1", { title: "Oi" })).rejects.toMatchObject({ errorCode: "PAGE_DRAFT_STALE" })

    expect(useDraftRevision.getState().stale).toBe(true)
    expect(revisionOf("p1")).toBe(3)
  })

  it("publishes the draft this tab saw, which leaves the revision where it was", async () => {
    editing("p1", 7)
    const sent = answer(201, { page: {}, version: {} })

    await publishPage("loja", "p1")

    expect(sent[0]!.revision).toBe("7")
    expect(revisionOf("p1")).toBe(7)
  })
})

describe("saw — what a draft read tells this tab", () => {
  it("starts from the first read, and ignores a slower read that is behind", () => {
    const { saw } = useDraftRevision.getState()
    saw("p1", 5)
    saw("p1", 4)

    expect(revisionOf("p1")).toBe(5)
    expect(useDraftRevision.getState().stale).toBe(false)
  })

  // Another tab wrote, and this one's open form was drawn before: carrying on would write over it.
  it("calls the tab stale when a read is further on than its own writes account for", () => {
    const { saw } = useDraftRevision.getState()
    saw("p1", 5)
    saw("p1", 6)

    expect(useDraftRevision.getState().stale).toBe(true)
  })

  it("ignores a read that answers while this tab's own write is still out", () => {
    const { saw, sent } = useDraftRevision.getState()
    saw("p1", 5)
    sent("p1")
    saw("p1", 6)

    expect(useDraftRevision.getState().stale).toBe(false)
  })
})
