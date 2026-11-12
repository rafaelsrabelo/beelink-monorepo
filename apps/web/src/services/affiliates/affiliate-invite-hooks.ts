"use client"

// Libs
import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { AcceptedAffiliate, AffiliateAcceptancePayload, AffiliateInvitation, AffiliateSignUpPayload, AffiliateSlugAvailability } from "@harness-monorepo/contracts"

// App
import { acceptAffiliateInvite, checkAffiliateSlug, fetchAffiliateInvitation, signUpThroughAffiliateInvite } from "./affiliate-invite-requests"

/** One invite's reads, by its token: the person invited holds nothing else of the shop's. */
export const affiliateInviteKeys = {
  invite: (token: string) => ["affiliate-invite", token] as const,
  slug: (token: string, slug: string) => [...affiliateInviteKeys.invite(token), "slug", slug] as const,
}

/** An invite gone or expired stays so: asking again buys nothing. A link with no token asks nothing at all. */
export function useAffiliateInvitation(token: string): UseQueryResult<AffiliateInvitation> {
  return useQuery({ queryKey: affiliateInviteKeys.invite(token), queryFn: () => fetchAffiliateInvitation(token), enabled: token !== "", retry: false, refetchOnWindowFocus: false })
}

/** Whether a `/name` serves, asked once the typing settled; nothing is asked for an empty field. */
export function useAffiliateSlugCheck(token: string, slug: string): UseQueryResult<AffiliateSlugAvailability> {
  return useQuery({ queryKey: affiliateInviteKeys.slug(token, slug), queryFn: () => checkAffiliateSlug(token, slug), enabled: slug.trim() !== "", retry: false, staleTime: 30_000 })
}

export function useAcceptAffiliateInvite(token: string): UseMutationResult<AcceptedAffiliate, Error, AffiliateAcceptancePayload> {
  return useMutation({ mutationFn: (payload: AffiliateAcceptancePayload) => acceptAffiliateInvite(token, payload) })
}

export function useAffiliateInviteSignUp(token: string): UseMutationResult<AcceptedAffiliate, Error, AffiliateSignUpPayload> {
  return useMutation({ mutationFn: (payload: AffiliateSignUpPayload) => signUpThroughAffiliateInvite(token, payload) })
}
