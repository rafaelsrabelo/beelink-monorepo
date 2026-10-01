// React
import type { CSSProperties } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { LandingProductValue, UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BeelinkMark } from "./beelink-mark"
import { LANDING_PRODUCT_ICON } from "./landing-product-icons"
import { LANDING_CONTAINER } from "./landing-styles"
import { LandingTitle } from "./landing-title"

export interface LandingEcosystemProps {
  messages?: UiMessages
}

/**
 * Where each hexagon sits on the design's stage, in px from its top-left. Beelink's own, in the
 * middle, covers 35px of the two beside it: their text keeps 38px from the edge, so no letter goes under it.
 */
const HEXES: readonly { product: LandingProductValue; x: number; y: number }[] = [
  { product: "store", x: 305, y: 6 },
  { product: "chat", x: 75, y: 136 },
  { product: "checkout", x: 535, y: 136 },
  { product: "shipping", x: 145, y: 456 },
  { product: "marketing", x: 465, y: 456 },
]

const HEXAGON = "lg:[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]"

/**
 * "Ecossistema": the five parts, and that each talks to the others. One list, drawn twice by the
 * screen it is on — the design's hexagons around Beelink's own where the stage fits, plain cards in
 * a grid where it does not — so the five are in the page once, for a reader and a crawler alike.
 *
 * Beside the stage the heading has a 400px column — the stage and it fit beside a classic scrollbar
 * too, which takes 15px from the window — and "E-COMMERCE." in the design's 64px is wider
 * than it: there, and only there, it is set smaller rather than run under the hexagons.
 */
export function LandingEcosystem({ messages = defaultMessages }: LandingEcosystemProps) {
  const text = messages.landing.ecosystem
  const products = messages.landing.products

  return (
    <section id="ecossistema" className={cn(LANDING_CONTAINER, "relative flex scroll-mt-6 flex-col gap-10 py-16 md:py-20 min-[90rem]:flex-row min-[90rem]:items-center min-[90rem]:gap-6 min-[90rem]:pt-[110px]")}>
      <div className="relative flex flex-col gap-[22px] min-[90rem]:w-[400px] min-[90rem]:shrink-0">
        <LandingTitle light={text.titleLight} strong={text.titleStrong} className="text-4xl leading-[0.98] uppercase md:text-[64px] min-[90rem]:text-[50px]" lightClassName="font-medium" />
        <p className="max-w-[560px] text-lg leading-[1.6] text-brand-text">{text.text}</p>
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-bold tracking-[0.32em] uppercase">{text.kicker}</span>
          <span className="text-brand-text">{text.kickerText}</span>
        </div>
      </div>

      <div className="relative lg:mx-auto lg:h-[760px] lg:w-[790px] lg:shrink-0 min-[90rem]:mx-0">
        <svg aria-hidden="true" width="860" height="760" viewBox="0 0 860 760" fill="none" stroke="currentColor" strokeWidth="2.4" className="absolute top-0 left-0 hidden text-brand-yellow lg:block">
          <path d="M430 150 L660 280 L590 600 L270 600 L200 280 Z" />
          <path d="M430 150 V400 M660 280 L430 400 M200 280 L430 400 M590 600 L430 400 M270 600 L430 400" />
        </svg>
        <ul className="grid gap-3 sm:grid-cols-2 lg:block">
          {HEXES.map(({ product, x, y }) => {
            const Icon = LANDING_PRODUCT_ICON[product]
            return (
              <li
                key={product}
                style={{ "--x": `${x}px`, "--y": `${y}px` } as CSSProperties}
                className="transition-transform lg:absolute lg:top-[var(--y)] lg:left-[var(--x)] lg:h-[288px] lg:w-[250px] lg:drop-shadow-xl motion-safe:lg:hover:-translate-y-1.5 motion-safe:lg:hover:scale-[1.03]"
              >
                <div className={cn(HEXAGON, "flex items-center gap-4 rounded-3xl bg-brand-surface p-5 lg:size-full lg:flex-col lg:justify-center lg:gap-2 lg:rounded-none lg:px-[38px] lg:text-center")}>
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-brand-yellow lg:mb-1 lg:size-[66px]">
                    <Icon aria-hidden="true" className="size-[26px] lg:size-[30px]" />
                  </span>
                  <span className="flex flex-col gap-1 lg:gap-2">
                    <b className="text-[19px] tracking-[0.02em]">{products[product].label}</b>
                    <span className="text-sm leading-[1.35] text-brand-muted">{products[product].text}</span>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
        <div aria-hidden="true" className="absolute top-[240px] left-[290px] hidden h-[320px] w-[280px] drop-shadow-2xl lg:block">
          <div className={cn(HEXAGON, "flex size-full flex-col items-center justify-center gap-3 bg-brand-surface")}>
            <BeelinkMark className="size-24" />
            <span className="text-[40px] font-extrabold tracking-[-0.03em]">{messages.landing.brand}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
