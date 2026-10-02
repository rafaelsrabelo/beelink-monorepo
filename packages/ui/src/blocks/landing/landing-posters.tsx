// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { LandingPicture, type LandingPhoto } from "./landing-picture"
import { LANDING_CONTAINER } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingPostersProps {
  /** The yellow poster at a bus stop. */
  busStop: LandingPhoto
  /** The black poster on a wall. */
  wall: LandingPhoto
  messages?: UiMessages
}

/**
 * Beelink's posters, side by side, before the last call: the brand as it is seen in the street.
 * Each is read out — what a poster says is the reason it is here.
 */
export function LandingPosters({ busStop, wall, messages = defaultMessages }: LandingPostersProps) {
  const text = messages.landing.posters
  const posters = [
    { photo: busStop, alt: text.busStopAlt },
    { photo: wall, alt: text.wallAlt },
  ]

  return (
    <section className={cn(LANDING_CONTAINER, "flex flex-col gap-10 py-14 md:gap-12 md:py-20")}>
      <LandingTitle light={text.titleLight} strong={text.titleStrong} className="text-[40px] leading-[0.98] md:text-[64px]" />
      <ul className="grid gap-6 md:grid-cols-2 md:gap-8">
        {posters.map(({ photo, alt }) => (
          <li key={photo.src}>
            {/* One shape for both, cut from the middle: the two posters were not taken at the same proportions. */}
            <LandingPicture
              photo={photo}
              alt={alt}
              sizes="(min-width: 90rem) 620px, (min-width: 48rem) 45vw, 100vw"
              className="aspect-3/4 w-full rounded-[32px] object-cover shadow-2xl shadow-brand-ink/15 md:rounded-[40px]"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
