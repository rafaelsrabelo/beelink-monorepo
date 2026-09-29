"use client"

// Libs
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { ShopConversation, ShopConversationPage, ShopConversationQuery, ShopConversationUnread } from "@harness-monorepo/contracts"

// App
import { REALTIME_URL } from "@/lib/realtime-config"
import { conversationKeys } from "./conversation-keys"
import { fetchShopConversation, fetchShopConversations, fetchShopUnread, markShopConversationRead, sendShopMessage } from "./shop-conversation-requests"

/** The channel reads these again at every event; without it, every half minute instead. */
const refetchInterval = REALTIME_URL ? false : 30_000

export function useShopConversations(slug: string, query: ShopConversationQuery = {}, enabled = true): UseQueryResult<ShopConversationPage> {
  return useQuery({
    queryKey: conversationKeys.shopList(slug, query),
    queryFn: () => fetchShopConversations(slug, query),
    enabled,
    refetchInterval,
  })
}

export function useShopUnread(slug: string, enabled = true): UseQueryResult<ShopConversationUnread> {
  return useQuery({ queryKey: conversationKeys.shopUnread(slug), queryFn: () => fetchShopUnread(slug), enabled, refetchInterval })
}

export function useShopConversation(slug: string, number: number | null): UseQueryResult<ShopConversation> {
  return useQuery({
    queryKey: conversationKeys.shopOrder(slug, number ?? 0),
    queryFn: () => fetchShopConversation(slug, number ?? 0),
    enabled: number !== null,
    refetchInterval,
  })
}

/**
 * The answer becomes the conversation on screen — after cancelling a read already in flight, which
 * began before it and would land over it — and the lists and the bell read their counts again.
 */
function useSettleShopConversation(slug: string) {
  const queryClient = useQueryClient()
  return async (conversation: ShopConversation) => {
    const queryKey = conversationKeys.shopOrder(slug, conversation.order.number)
    await queryClient.cancelQueries({ queryKey })
    queryClient.setQueryData(queryKey, conversation)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [...conversationKeys.shop(slug), "list"] }),
      queryClient.invalidateQueries({ queryKey: conversationKeys.shopUnread(slug) }),
    ])
  }
}

export function useSendShopMessage(slug: string, number: number): UseMutationResult<ShopConversation, Error, string> {
  const settle = useSettleShopConversation(slug)
  return useMutation({ mutationFn: (body: string) => sendShopMessage(slug, number, { body }), onSuccess: settle })
}

export function useMarkShopConversationRead(slug: string, number: number): UseMutationResult<ShopConversation, Error, void> {
  const settle = useSettleShopConversation(slug)
  return useMutation({ mutationFn: () => markShopConversationRead(slug, number), onSuccess: settle })
}
