// Libs
import { ShoppingBagIcon, TruckIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BeelinkMark } from "./beelink-mark"

export interface LandingPhoneBannerProps {
  messages?: UiMessages
}

/**
 * The middle banner: a phone with a shop on it, an order arriving and a delivery leaving. A picture
 * — said once to a reader, by its label — drawn on the design's 600 × 580 stage and shrunk whole
 * where the banner is narrower, so nothing in it has to be laid out twice.
 */
export function LandingPhoneBanner({ messages = defaultMessages }: LandingPhoneBannerProps) {
  const text = messages.landing.banners.phone

  return (
    <div role="img" aria-label={text.label} className="relative h-full min-h-[480px] overflow-hidden rounded-[36px] bg-brand-sand sm:h-[580px]">
      <div aria-hidden="true" className="absolute top-1/2 left-1/2 h-[580px] w-[600px] -translate-x-1/2 -translate-y-1/2 scale-[0.53] sm:scale-100">
        <span className="absolute top-[70px] left-[120px] size-[420px] rounded-full bg-brand-yellow opacity-55" />
        <div className="absolute top-[50px] left-[170px] h-[540px] w-[260px] -rotate-6 rounded-[40px] bg-brand-ink p-2.5 shadow-2xl shadow-brand-ink/30">
          <div className="flex size-full flex-col overflow-hidden rounded-[31px] bg-brand-surface">
            <div className="flex h-[46px] items-center gap-2 bg-brand-ink px-3.5 text-sm font-extrabold text-brand-on-ink">
              <BeelinkMark strokeWidth={3.6} className="size-[18px] text-brand-yellow" />
              {text.shop}
            </div>
            <div className="m-2.5 flex h-[120px] flex-col justify-end gap-1 rounded-[14px] bg-brand-yellow p-3">
              <b className="text-base leading-[1.1]">{text.collection}</b>
              <span className="h-3.5 w-[60px] rounded-full bg-brand-ink" />
            </div>
            <div className="grid grid-cols-2 gap-2 px-2.5">
              {[0, 1, 2, 3].map((tile) => (
                <span key={tile} className="h-[120px] rounded-[10px] bg-brand-sand-soft" />
              ))}
            </div>
          </div>
        </div>
        <div className="absolute top-[120px] left-9 flex w-[230px] items-center gap-3 rounded-[18px] bg-brand-surface px-4 py-3.5 shadow-xl shadow-brand-ink/15">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-yellow">
            <ShoppingBagIcon className="size-5" />
          </span>
          <span className="flex flex-col">
            <b className="text-sm">{text.order}</b>
            <span className="text-xs text-brand-muted">{text.orderDetail}</span>
          </span>
        </div>
        <div className="absolute right-[30px] bottom-[90px] flex w-[236px] items-center gap-3 rounded-[18px] bg-brand-ink px-4 py-3.5 text-brand-on-ink shadow-xl shadow-brand-ink/25">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-yellow text-brand-ink">
            <TruckIcon className="size-5" />
          </span>
          <span className="flex flex-col">
            <b className="text-sm">{text.out}</b>
            <span className="text-xs text-brand-on-ink-text">{text.outDetail}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
