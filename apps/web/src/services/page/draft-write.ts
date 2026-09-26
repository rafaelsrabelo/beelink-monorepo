// App
import { useDraftRevision } from "@/stores/draft-revision"
import { PageRequestError } from "./page-call"

/** The writes of one shop's draft, one after another: each names the revision the last one left. */
const queues = new Map<string, Promise<unknown>>()

/**
 * A write to the page draft being edited, queued behind the ones before it and sent with the
 * revision they left — the API refuses a stale one with 409, which is how a second tab finds out.
 *
 * One at a time because the revision is a count: two writes in flight would both name the same one,
 * and the second would be refused by the first. A write that lands moves the count on by one; one
 * that is refused leaves it, and a stale one tells the editor to reload. Before the editor has read
 * the draft there is no revision to name, and the write goes unchecked, as any old caller's does.
 *
 * `advance: false` is Publicar: it names the revision, to publish only the draft this tab saw, and
 * changes nothing in it.
 */
export function draftWrite<T>(slug: string, run: (revision?: number) => Promise<T>, { advance = true } = {}): Promise<T> {
  const previous = queues.get(slug) ?? Promise.resolve()

  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const cursor = useDraftRevision.getState().cursors[slug]
      try {
        const answer = await run(cursor?.revision)
        if (cursor && advance) useDraftRevision.getState().landed(slug, cursor.pageId, cursor.revision)
        return answer
      } catch (error) {
        if (error instanceof PageRequestError && error.errorCode === "PAGE_DRAFT_STALE") useDraftRevision.getState().markStale()
        throw error
      }
    })

  queues.set(slug, next)
  return next
}
