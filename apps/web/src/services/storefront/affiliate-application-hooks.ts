"use client"

// Libs
import { useMutation, type UseMutationResult } from "@tanstack/react-query"

// Types
import type { AffiliateApplicationPayload } from "@harness-monorepo/contracts"

// App
import { sendAffiliateApplication } from "./affiliate-application-requests"

/** The application sent; the API answers alike whatever became of it, so there is nothing to read back. */
export function useSendAffiliateApplication(slug: string): UseMutationResult<void, Error, AffiliateApplicationPayload> {
  return useMutation({ mutationFn: (payload: AffiliateApplicationPayload) => sendAffiliateApplication(slug, payload) })
}
