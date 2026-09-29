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

/** How long before asking again after a refusal, growing to half a minute. */
const RETRY_FIRST_MS = 2_000
const RETRY_MAX_MS = 30_000

/** A shop that is not the session's, or not there at all: asking again cannot change the answer. */
const FINAL_REFUSALS: ReadonlySet<number> = new Set([403, 404])

/** Give or take a quarter, so the tabs one restart dropped do not all come back in the same instant. */
function jittered(ms: number): number {
  return Math.round(ms * (0.75 + Math.random() * 0.5))
}

/**
 * The page's real-time channel (BEELINK-161): a socket to the API, entered with a ticket asked
 * through the web's own handlers — the session's tokens never reach the page. A dropped connection
 * Socket.IO takes back on its own, with a growing, jittered wait. A refused ticket, or a socket the
 * API closed itself (its session ended), it does not: those are asked again here, the same way.
 *
 * A 401 waits the longest and asks again rather than stopping: on the panel it is as often the
 * 15-minute access cookie lapsing as the session ending, and the next page the person opens renews
 * it. The first connect reads nothing again — the page was just read — so what happens between that
 * read and the join is the one gap it accepts. It only listens: every write stays with the REST.
 */
export function useRealtimeChannel({ enabled, ticket, onEvent, onReconnect }: RealtimeChannelOptions): void {
  const handlers = useRef({ onEvent, onReconnect })
  useEffect(() => {
    handlers.current = { onEvent, onReconnect }
  })

  useEffect(() => {
    if (!enabled || !REALTIME_URL) return

    let stopped = false
    let missed = false
    let retry = RETRY_FIRST_MS
    let refusal: number | null = null
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const socket = io(REALTIME_URL, {
      path: REALTIME_PATH,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: RETRY_MAX_MS,
      auth: (answer) => {
        // An answer that arrives after a newer attempt began would knock at the wrong connection.
        const current = ++attempt
        refusal = null
        ticket().then(
          (value) => {
            if (current === attempt) answer({ ticket: value })
          },
          (error: unknown) => {
            if (current !== attempt) return
            refusal = error instanceof RealtimeTicketError ? error.status : 0
            answer({})
          },
        )
      },
    })

    const askAgain = () => {
      if (stopped) return
      if (refusal !== null && FINAL_REFUSALS.has(refusal)) {
        stopped = true
        return
      }
      const wait = refusal === 401 ? RETRY_MAX_MS : retry
      retry = Math.min(retry * 2, RETRY_MAX_MS)
      clearTimeout(timer)
      timer = setTimeout(() => socket.connect(), jittered(wait))
    }

    socket.on(REALTIME_EVENT, (event: RealtimeEvent) => handlers.current.onEvent(event))
    socket.on("connect", () => {
      retry = RETRY_FIRST_MS
      if (!missed) return
      missed = false
      handlers.current.onReconnect()
    })
    socket.on("disconnect", (reason) => {
      missed = true
      if (reason === "io server disconnect") askAgain()
    })
    socket.on("connect_error", () => {
      missed = true
      if (!socket.active) askAgain()
    })

    return () => {
      stopped = true
      clearTimeout(timer)
      socket.disconnect()
    }
  }, [enabled, ticket])
}
