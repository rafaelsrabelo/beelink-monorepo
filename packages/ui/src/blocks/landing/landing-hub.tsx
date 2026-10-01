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
import { LANDING_LIFT } from "./landing-styles"

export interface LandingHubProps {
  className?: string
  messages?: UiMessages
}

/** Where each card sits on the design's 568 × 600 stage, in px from its top-left. */
const HUB: readonly { product: LandingProductValue; x: number; y: number }[] = [
  { product: "store", x: 140, y: 0 },
  { product: "chat", x: -40, y: 150 },
  { product: "checkout", x: 320, y: 150 },
  { product: "shipping", x: -10, y: 440 },
  { product: "marketing", x: 300, y: 440 },
]

/**
 * The hero's picture: Beelink's mark in the middle, the five parts of the ecosystem around it, a
 * yellow line to each. A picture and not a list — the ecosystem's own section, further down, is
 * where the five are said — so a reader is spared hearing them twice, and a screen too narrow for
 * the stage does not draw it at all.
 */
export function LandingHub({ className, messages = defaultMessages }: LandingHubProps) {
  const products = messages.landing.products

  return (
    <div aria-hidden="true" className={cn("relative h-[600px] w-[568px] shrink-0", className)}>
      <svg width="568" height="600" viewBox="0 0 568 600" fill="none" stroke="currentColor" strokeWidth="2" className="absolute inset-0 overflow-visible text-brand-yellow">
        <path d="M285 335 V92" />
        <path d="M285 335 C240 335 250 196 210 196" />
        <path d="M285 335 C330 335 300 196 320 196" />
        <path d="M285 335 L120 440" />
        <path d="M285 335 L420 440" />
      </svg>
      <div className="absolute top-[260px] left-[210px] flex size-[150px] items-center justify-center rounded-[36px] bg-brand-yellow shadow-2xl ring-[14px] shadow-brand-yellow/45 ring-brand-yellow/20">
        <BeelinkMark strokeWidth={3.2} className="size-[78px]" />
      </div>
      {HUB.map(({ product, x, y }) => {
        const Icon = LANDING_PRODUCT_ICON[product]
        return (
          <div
            key={product}
            style={{ "--x": `${x}px`, "--y": `${y}px` } as CSSProperties}
            className={cn(LANDING_LIFT, "absolute top-[var(--y)] left-[var(--x)] flex w-[250px] items-center gap-3.5 rounded-3xl bg-brand-surface p-[18px] shadow-xl shadow-brand-ink/5")}
          >
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-yellow">
              <Icon className="size-[26px]" />
            </span>
            <span className="flex flex-col gap-0.5">
              <b className="text-lg">{products[product].name}</b>
              <span className="text-[13px] leading-[1.35] text-brand-muted">{products[product].text}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
