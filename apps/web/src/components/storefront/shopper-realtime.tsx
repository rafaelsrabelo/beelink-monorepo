"use client"

// React
import { useCallback } from "react"

// Next
import { useRouter } from "next/navigation"

// Libs
import { useQueryClient } from "@tanstack/react-query"

// App
import { shopperReadOf } from "@/services/realtime/realtime-invalidation"
import { fetchShopperTicket } from "@/services/realtime/realtime-requests"
import { useRealtimeChannel } from "@/services/realtime/use-realtime-channel"

/**
 * The shop window's ear on the signed-in shopper's room: the shop confirming their order, moving it,
 * answering them. Their orders are drawn on the server, so news of one reads the page again; their
 * conversations are queries, read again by key.
 */
export function ShopperRealtime({ slug }: { slug: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const ticket = useCallback(() => fetchShopperTicket(slug), [slug])

  useRealtimeChannel({
    enabled: true,
    ticket,
    onEvent: (event) => {
      const read = shopperReadOf(event, slug)
      for (const queryKey of read.keys) void queryClient.invalidateQueries({ queryKey })
      if (read.page) router.refresh()
    },
    onReconnect: () => {
      void queryClient.invalidateQueries()
      router.refresh()
    },
  })

  return null
}
