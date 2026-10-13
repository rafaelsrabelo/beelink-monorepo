"use client"

// Libs
import { useMutation } from "@tanstack/react-query"
import type { UseMutationResult } from "@tanstack/react-query"

// Types
import type { CourierApplicationPayload } from "@harness-monorepo/contracts"

// App
import { sendCourierApplication } from "./courier-application-requests"
import type { CourierApplicationRequestError } from "./courier-application-requests"

/**
 * The landing's courier form, sending (BEELINK-322). A mutation and nothing cached: the answer is
 * yes or no, and nothing is read back — there is no list for a visitor to see.
 *
 * Never retried by itself: a send repeated behind the person's back spends the per-address limit,
 * and a failure is theirs to send again.
 */
export function useSendCourierApplication(): UseMutationResult<void, CourierApplicationRequestError, CourierApplicationPayload> {
  return useMutation({ mutationFn: sendCourierApplication, retry: false })
}
