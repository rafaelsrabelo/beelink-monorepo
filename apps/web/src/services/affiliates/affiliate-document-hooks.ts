"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { AffiliateDocumentPayload, AffiliateDocumentUpload, AffiliateDocumentView, ShopAffiliate } from "@harness-monorepo/contracts"

// App
import { affiliateKeys } from "./affiliate-keys"
import { fetchAffiliateDocument, replaceAffiliateDocument, stageAffiliateDocument } from "./affiliate-document-requests"

/** A minute short of the ten the links last: the page asks again before a photo stops loading. */
const LINKS_FRESH_MS = 9 * 60 * 1000

export function useStageAffiliateDocument(slug: string): UseMutationResult<AffiliateDocumentUpload, Error, File> {
  return useMutation({ mutationFn: (file: File) => stageAffiliateDocument(slug, file) })
}

/** Read only when there is a document to read: one invited without it answers 404, and asks nothing. */
export function useAffiliateDocument(slug: string, affiliateId: string, enabled: boolean): UseQueryResult<AffiliateDocumentView> {
  return useQuery({
    queryKey: affiliateKeys.document(slug, affiliateId),
    queryFn: () => fetchAffiliateDocument(slug, affiliateId),
    enabled,
    staleTime: LINKS_FRESH_MS,
    refetchInterval: LINKS_FRESH_MS,
  })
}

/** Sent, or sent again: the record takes the answer, and the links are read anew. */
export function useReplaceAffiliateDocument(slug: string, affiliateId: string): UseMutationResult<ShopAffiliate, Error, AffiliateDocumentPayload> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AffiliateDocumentPayload) => replaceAffiliateDocument(slug, affiliateId, payload),
    onSuccess: (affiliate) => {
      queryClient.setQueryData(affiliateKeys.person(slug, affiliateId), affiliate)
      return queryClient.invalidateQueries({ queryKey: affiliateKeys.document(slug, affiliateId) })
    },
  })
}
