"use client"

// Libs
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query"

// Types
import type { PageDraft, PageProblem, PageVersionSummary, PublishPagePayload, PublishPageResult } from "@harness-monorepo/contracts"

// App
import { sectionKeys } from "./page-hooks"
import { fetchPageDraft, fetchPageProblems, fetchPageVersions, publishPage, restoreVersion } from "./store-page-requests"
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

export function usePageVersions(slug: string, pageId: string): UseQueryResult<PageVersionSummary[], Error> {
  return useQuery({
    queryKey: sectionKeys.versions(slug, pageId),
    queryFn: () => fetchPageVersions(slug, pageId),
    enabled: slug !== "" && pageId !== "",
  })
}

/**
 * What Publicar would serve that the owner may not mean, asked only while the dialog is open and
 * nothing is still on its way to the draft — a list of the draft before the last save lands is a
 * list of the wrong page. Never cached: it is a check of the page as it is now.
 */
export function usePageProblems(slug: string, pageId: string, enabled: boolean): UseQueryResult<PageProblem[], Error> {
  return useQuery({
    queryKey: sectionKeys.problems(slug, pageId),
    queryFn: () => fetchPageProblems(slug, pageId),
    enabled: enabled && slug !== "" && pageId !== "",
    staleTime: 0,
    gcTime: 0,
  })
}

/** A version into the draft. The draft, its sections and the history are read again: they all changed. */
export function useRestoreVersion(slug: string, pageId: string): UseMutationResult<PageDraft, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (versionId: string) => restoreVersion(slug, pageId, versionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sectionKeys.store(slug) }),
  })
}
