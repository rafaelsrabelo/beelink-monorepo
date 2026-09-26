// Types
import type {
  CreateLandingPayload,
  PageDraft,
  PageProblem,
  PageSlugAvailability,
  PageVersionSummary,
  PublishPagePayload,
  PublishPageResult,
  StorePage,
  UpdatePagePayload,
} from "@harness-monorepo/contracts"

// App
import { useDraftRevision } from "@/stores/draft-revision"
import { draftWrite } from "./draft-write"
import { call } from "./page-call"

const pagesPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/pages`

/** The shop's home, then its landings, newest first — archived ones too. */
export function fetchPages(slug: string): Promise<StorePage[]> {
  return call<StorePage[]>(pagesPath(slug), { method: "GET" })
}

/** A landing, as a draft, with the bands its template opens with. */
export function createPage(slug: string, payload: CreateLandingPayload): Promise<StorePage> {
  return call<StorePage>(pagesPath(slug), { method: "POST", body: JSON.stringify(payload) })
}

export function updatePage(slug: string, pageId: string, payload: UpdatePagePayload): Promise<StorePage> {
  return call<StorePage>(`${pagesPath(slug)}/${encodeURIComponent(pageId)}`, { method: "PATCH", body: JSON.stringify(payload) })
}

/** Whether an address is free, as the API would store it. `except` is the landing being renamed. */
export function fetchPageSlugAvailability(slug: string, candidate: string, except?: string): Promise<PageSlugAvailability> {
  const query = new URLSearchParams({ slug: candidate, ...(except ? { except } : {}) })
  return call<PageSlugAvailability>(`${pagesPath(slug)}/availability?${query.toString()}`, { method: "GET" })
}

/** A page's draft and whether it differs from what the shop serves. */
export async function fetchPageDraft(slug: string, pageId: string): Promise<PageDraft> {
  const draft = await call<PageDraft>(`${pagesPath(slug)}/${encodeURIComponent(pageId)}/draft`, { method: "GET" })
  // What the next write names: a read is where this tab learns the revision, and another tab's.
  useDraftRevision.getState().saw(slug, { pageId, revision: draft.revision })
  return draft
}

/** Publicar: the draft frozen as the page's next version, and served. */
/** Queued behind the draft's writes and naming their revision: it publishes the draft this tab saw. */
export function publishPage(slug: string, pageId: string, payload: PublishPagePayload = {}): Promise<PublishPageResult> {
  return draftWrite(
    slug,
    (revision) =>
      call<PublishPageResult>(`${pagesPath(slug)}/${encodeURIComponent(pageId)}/publish`, { method: "POST", body: JSON.stringify(payload) }, revision),
    { advance: false },
  )
}

/** A page's versions, newest first; the newest is live while the page is up. */
export function fetchPageVersions(slug: string, pageId: string): Promise<PageVersionSummary[]> {
  return call<PageVersionSummary[]>(`${pagesPath(slug)}/${encodeURIComponent(pageId)}/versions`, { method: "GET" })
}

/** What Publicar would serve that the owner may not mean to. */
export function fetchPageProblems(slug: string, pageId: string): Promise<PageProblem[]> {
  return call<PageProblem[]>(`${pagesPath(slug)}/${encodeURIComponent(pageId)}/problems`, { method: "GET" })
}

/** A version copied into the draft — a write to it like any other, queued and naming its revision. */
export function restoreVersion(slug: string, pageId: string, versionId: string): Promise<PageDraft> {
  return draftWrite(slug, (revision) =>
    call<PageDraft>(
      `${pagesPath(slug)}/${encodeURIComponent(pageId)}/versions/${encodeURIComponent(versionId)}/restore`,
      { method: "POST" },
      revision,
    ),
  )
}
