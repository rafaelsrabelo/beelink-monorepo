// React
import type { ReactNode } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LANDING_CONTAINER } from "./landing-styles"
import { LandingTitle } from "./landing-title"

/**
 * Each poster arrives as the app's own optimised image, filling the frame it is given and read out
 * with `busStopAlt` / `wallAlt`: what a poster says is the reason it is here.
 */
export interface LandingPostersProps {
  /** The yellow poster at a bus stop. */
  busStop: ReactNode
  /** The black poster on a wall. */
  wall: ReactNode
  messages?: UiMessages
}

/** Beelink's posters, side by side, before the last call: the brand as it is seen in the street. */
export function LandingPosters({ busStop, wall, messages = defaultMessages }: LandingPostersProps) {
  const text = messages.landing.posters

  return (
    <section className={cn(LANDING_CONTAINER, "flex flex-col gap-10 py-14 md:gap-12 md:py-20")}>
      <LandingTitle light={text.titleLight} strong={text.titleStrong} className="text-[40px] leading-[0.98] md:text-[64px]" />
      <ul className="grid gap-6 md:grid-cols-2 md:gap-8">
        {[busStop, wall].map((poster, at) => (
          // One shape for both, cut from the middle: the two posters were not taken at the same proportions.
          <li key={at} className="relative aspect-3/4 overflow-hidden rounded-[32px] bg-brand-ink shadow-2xl shadow-brand-ink/15 md:rounded-[40px]">
            {poster}
          </li>
        ))}
      </ul>
    </section>
  )
}
