"use client"

// React
import { useEffect, useState } from "react"

// UI
import { StorefrontCountdown } from "@harness-monorepo/ui/blocks/storefront/storefront-countdown"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontCountdownLiveProps {
  layout: "BAND" | "BLOCK"
  title: string | null
  subtitle: string | null
  endsAt: string
  bleed: boolean
  /** Design mode: it stays drawn past its end, marked so, where the shop leaves it out. */
  editing: boolean
  messages: UiMessages
}

/**
 * A countdown that ticks. The first render has no clock — the server's is not the visitor's, and the
 * two renders must agree — so it draws its end as a date and waits for the effect to start the digits.
 *
 * Past its end the shop hides it: the read leaves an ended countdown out, but a page served from the
 * cache a minute old, or left open, would otherwise say zero for a sale that is over.
 */
export function StorefrontCountdownLive({ layout, title, subtitle, endsAt, bleed, editing, messages }: StorefrontCountdownLiveProps) {
  const [now, setNow] = useState<number | null>(null)
  const end = Date.parse(endsAt)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const first = window.setTimeout(tick, 0)
    const every = window.setInterval(tick, 1000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(every)
    }
  }, [])

  const ended = now !== null && now >= end
  if (ended && !editing) return null

  return (
    <StorefrontCountdown
      layout={layout}
      title={title}
      subtitle={subtitle}
      endsAt={endsAt}
      now={now}
      bleed={bleed}
      ended={ended}
      messages={messages}
    />
  )
}
