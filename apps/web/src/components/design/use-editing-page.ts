"use client"

// React
import { useEffect } from "react"

// App
import { usePageDraft } from "@/services/page/page-draft-hooks"
import { useDraftRevision } from "@/stores/draft-revision"

/**
 * The page the editor has open, told to the draft's write queue: its writes name this page's
 * revision, never another page's the tab visited before. And the revision this page's draft read
 * answered, even when it was served from the cache — going back to a page seen a minute ago reads
 * no network, and the queue must still know where the page stands.
 */
export function useEditingPage(slug: string, pageId: string): void {
  const draft = usePageDraft(slug, pageId)
  const revision = draft.data?.revision

  useEffect(() => {
    useDraftRevision.getState().open(slug, pageId)
    return () => useDraftRevision.getState().close(slug, pageId)
  }, [slug, pageId])

  useEffect(() => {
    if (revision !== undefined) useDraftRevision.getState().saw(pageId, revision)
  }, [pageId, revision])
}
