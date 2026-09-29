"use client"

// Libs
import { useQuery, type UseQueryResult } from "@tanstack/react-query"

// Types
import type { ShopConversationPage, ShopConversationQuery, ShopConversationUnread } from "@harness-monorepo/contracts"

// App
import { REALTIME_URL } from "@/lib/realtime-config"
import { conversationKeys } from "./conversation-keys"
import { fetchShopConversations, fetchShopUnread } from "./shop-conversation-requests"

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
