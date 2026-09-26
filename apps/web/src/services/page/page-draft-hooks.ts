"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { PageDraft, PublishPagePayload, PublishPageResult } from "@harness-monorepo/contracts"

// App
import { sectionKeys } from "./page-hooks"
import { fetchPageDraft, publishPage } from "./store-page-requests"
import { pageKeys } from "./store-pages-hooks"

/**
 * A page's draft as the API holds it, and whether it differs from what is served. Its key sits under
 * the shop's section prefix, so every write that changes the draft drops it too.
 */
export function usePageDraft(slug: string, pageId: string): UseQueryResult<PageDraft, Error> {
  return useQuery({
    queryKey: sectionKeys.draft(slug, pageId),
    queryFn: () => fetchPageDraft(slug, pageId),
    enabled: slug !== "" && pageId !== "",
  })
}

/** Publicar: the draft frozen as the page's next version. The page list and the draft are read again. */
export function usePublishPage(slug: string, pageId: string): UseMutationResult<PublishPageResult, Error, PublishPagePayload | void> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PublishPagePayload | void) => publishPage(slug, pageId, payload ?? {}),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sectionKeys.store(slug) }),
        queryClient.invalidateQueries({ queryKey: pageKeys.list(slug) }),
      ]),
  })
}
