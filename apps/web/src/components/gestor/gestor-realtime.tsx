"use client"

// React
import { useCallback } from "react"

// Libs
import { useQueryClient } from "@tanstack/react-query"

// App
import { panelKeysOf } from "@/services/realtime/realtime-invalidation"
import { fetchPanelTicket } from "@/services/realtime/realtime-requests"
import { useRealtimeChannel } from "@/services/realtime/use-realtime-channel"

/**
 * The manager's ear on its shop's room: the panel's, reading the same queries again, with no toast
 * — the board is the news, and the bell is what says it. The board also asks again on its own
 * clock, so a channel that dropped never leaves an order unrung for long.
 */
export function GestorRealtime({ slug }: { slug: string }) {
  const queryClient = useQueryClient()
  const ticket = useCallback(() => fetchPanelTicket(slug), [slug])

  useRealtimeChannel({
    enabled: true,
    ticket,
    onEvent: (event) => {
      for (const queryKey of panelKeysOf(event, slug)) void queryClient.invalidateQueries({ queryKey })
    },
    onReconnect: () => void queryClient.invalidateQueries(),
  })

  return null
}
