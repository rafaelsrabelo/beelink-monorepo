"use client"

// React
import { useCallback } from "react"

// Next
import { useParams, useRouter } from "next/navigation"

// Libs
import { useQueryClient } from "@tanstack/react-query"

// UI
import { toast } from "@harness-monorepo/ui/components/sonner"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { panelOrderHrefOf, toastOf } from "@/lib/panel-notifications"
import { panelKeysOf } from "@/services/realtime/realtime-invalidation"
import { fetchPanelTicket } from "@/services/realtime/realtime-requests"
import { useRealtimeChannel } from "@/services/realtime/use-realtime-channel"

/**
 * The panel's ear on its shop's room: an order placed or moved, a message, a read — each reads the
 * matching queries again. Open wherever the address names a shop; the dashboard has none to hear.
 * What came from a customer is also told in a toast, with the way to its order (BEELINK-163).
 */
export function PanelRealtime({ messages }: { messages: UiMessages }) {
  const router = useRouter()
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
      const told = toastOf(event, messages)
      if (told) toast(told, { action: { label: messages.shell.notificationOpen, onClick: () => router.push(panelOrderHrefOf(slug, event.orderNumber) as Parameters<typeof router.push>[0]) } })
    },
    onReconnect: () => void queryClient.invalidateQueries(),
  })

  return null
}
