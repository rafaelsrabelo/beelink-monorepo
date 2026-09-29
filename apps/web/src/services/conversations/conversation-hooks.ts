"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { CustomerConversation, CustomerConversationSummary } from "@harness-monorepo/contracts"

// App
import { REALTIME_URL } from "@/lib/realtime-config"
import { conversationKeys } from "./conversation-keys"
import { fetchShopperConversation, fetchShopperConversations, markShopperConversationRead, sendShopperMessage } from "./conversation-requests"

/**
 * The channel reads these again at every event; without it — a build with no socket URL — they are
 * read again every half minute instead, so a reply still arrives, late.
 */
const WITHOUT_CHANNEL_MS = 30_000
const refetchInterval = REALTIME_URL ? false : WITHOUT_CHANNEL_MS

/**
 * No retry: a failure shows its sentence and a "Tentar de novo", and a 401 has already cleared the
 * shopper's cookies on the server — asking again three times would only say so three times.
 */
export function useShopperConversations(slug: string, enabled = true): UseQueryResult<CustomerConversationSummary[]> {
  return useQuery({
    queryKey: conversationKeys.shopperList(slug),
    queryFn: () => fetchShopperConversations(slug),
    enabled,
    retry: false,
    refetchInterval,
  })
}

export function useShopperConversation(slug: string, number: number | null): UseQueryResult<CustomerConversation> {
  return useQuery({
    queryKey: conversationKeys.shopperOrder(slug, number ?? 0),
    queryFn: () => fetchShopperConversation(slug, number ?? 0),
    enabled: number !== null,
    retry: false,
    refetchInterval,
  })
}

/** What the API answered becomes the conversation on screen; the list reads its last line and count again. */
function useSettleConversation(slug: string) {
  const queryClient = useQueryClient()
  return (conversation: CustomerConversation) => {
    queryClient.setQueryData(conversationKeys.shopperOrder(slug, conversation.order.number), conversation)
    return queryClient.invalidateQueries({ queryKey: conversationKeys.shopperList(slug) })
  }
}

export function useSendShopperMessage(slug: string, number: number): UseMutationResult<CustomerConversation, Error, string> {
  const settle = useSettleConversation(slug)
  return useMutation({ mutationFn: (body: string) => sendShopperMessage(slug, number, { body }), onSuccess: settle })
}

export function useMarkShopperConversationRead(slug: string, number: number): UseMutationResult<CustomerConversation, Error, void> {
  const settle = useSettleConversation(slug)
  return useMutation({ mutationFn: () => markShopperConversationRead(slug, number), onSuccess: settle })
}
