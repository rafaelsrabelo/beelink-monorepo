"use client"

// React
import { useCallback } from "react"

// Next
import { useParams } from "next/navigation"

// Libs
import { useQueryClient } from "@tanstack/react-query"

// App
import { panelKeysOf } from "@/services/realtime/realtime-invalidation"
import { fetchPanelTicket } from "@/services/realtime/realtime-requests"
import { useRealtimeChannel } from "@/services/realtime/use-realtime-channel"

/**
 * The panel's ear on its shop's room: an order placed or moved, a message, a read — each reads the
 * matching queries again. Open wherever the address names a shop; the dashboard has none to hear.
 */
export function PanelRealtime() {
  const params = useParams<{ slug?: string | string[] }>()
  const slug = typeof params.slug === "string" ? params.slug : null
  const queryClient = useQueryClient()
  const ticket = useCallback(() => fetchPanelTicket(slug ?? ""), [slug])

  useRealtimeChannel({
    enabled: slug !== null,
    ticket,
    onEvent: (event) => {
      if (!slug) return
      for (const queryKey of panelKeysOf(event, slug)) void queryClient.invalidateQueries({ queryKey })
    },
    onReconnect: () => void queryClient.invalidateQueries(),
  })

  return null
}
