"use client"

// React
import { useEffect, useRef } from "react"

// Libs
import { io } from "socket.io-client"

// Types
import type { RealtimeEvent } from "@harness-monorepo/contracts"

// App
import { REALTIME_EVENT, REALTIME_PATH, REALTIME_URL } from "@/lib/realtime-config"
import { RealtimeTicketError } from "./realtime-requests"

export interface RealtimeChannelOptions {
  /** Off while there is nobody to listen for: no shop in the address, no shopper signed in. */
  enabled: boolean
  /** A fresh ticket for each attempt: a ticket lets a socket in once. Keep it stable (`useCallback`). */
  ticket: () => Promise<string>
  onEvent: (event: RealtimeEvent) => void
  /** Back after a gap — dropped, refused, never in yet: whatever was said meanwhile is lost, so read everything again. */
  onReconnect: () => void
}

/** How long before asking again after a refused ticket, growing to half a minute. */
const RETRY_FIRST_MS = 2_000
const RETRY_MAX_MS = 30_000

/**
 * The page's real-time channel (BEELINK-161): a socket to the API, entered with a ticket asked
 * through the web's own handlers — the session's tokens never reach the page. Socket.IO takes it
 * back after a dropped connection with a growing, jittered wait; a refused ticket is asked for again
 * here, the same way, until the session is gone. It only listens: every write stays with the REST.
 */
export function useRealtimeChannel({ enabled, ticket, onEvent, onReconnect }: RealtimeChannelOptions): void {
  const handlers = useRef({ onEvent, onReconnect })
  useEffect(() => {
    handlers.current = { onEvent, onReconnect }
  })

  useEffect(() => {
    if (!enabled || !REALTIME_URL) return

    let signedOut = false
    let missed = false
    let retry = RETRY_FIRST_MS
    let timer: ReturnType<typeof setTimeout> | undefined

    const socket = io(REALTIME_URL, {
      path: REALTIME_PATH,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: RETRY_MAX_MS,
      auth: (answer) => {
        ticket().then(
          (value) => answer({ ticket: value }),
          (error: unknown) => {
            // A session that ended stops the asking; anything else is asked for again later.
            if (error instanceof RealtimeTicketError && error.status === 401) signedOut = true
            answer({})
          },
        )
      },
    })

    socket.on(REALTIME_EVENT, (event: RealtimeEvent) => handlers.current.onEvent(event))
    socket.on("connect", () => {
      retry = RETRY_FIRST_MS
      if (!missed) return
      missed = false
      handlers.current.onReconnect()
    })
    socket.on("disconnect", () => {
      missed = true
    })
    // Refused by the gateway, Socket.IO does not try again on its own: a new ticket is asked for here.
    socket.on("connect_error", () => {
      missed = true
      if (signedOut || socket.active) return
      timer = setTimeout(() => socket.connect(), retry)
      retry = Math.min(retry * 2, RETRY_MAX_MS)
    })

    return () => {
      clearTimeout(timer)
      socket.disconnect()
    }
  }, [enabled, ticket])
}
