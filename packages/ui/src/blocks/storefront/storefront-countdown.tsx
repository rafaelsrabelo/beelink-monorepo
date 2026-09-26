// UI
import { cn } from "@harness-monorepo/ui/lib/utils"
import { SHOP_TIME_ZONE, remainingOf } from "@harness-monorepo/ui/lib/shop-time"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontCountdownProps {
  /** `BAND`: a strip of the shop's colour. `BLOCK`: a box that fits a slice. */
  layout: "BAND" | "BLOCK"
  title?: string | null
  subtitle?: string | null
  /** The instant it counts to, ISO-8601. */
  endsAt: string
  /** The clock the digits are drawn from; null before the page's script runs, which draws no digits. */
  now: number | null
  /** In an edge-to-edge band a strip reaches the edges; anywhere else it keeps round corners. */
  bleed?: boolean
  /** Past its end, in the editor only: the shop draws nothing, and the owner is told why. */
  ended?: boolean
  /** The zone its end is said in. */
  timeZone?: string
  className?: string
  messages?: UiMessages
}

const LAYOUT = {
  BAND: { box: "bg-shop-primary text-shop-on-primary px-6 py-8", digit: "bg-shop-on-primary/15" },
  BLOCK: { box: "rounded-2xl border border-shop-line px-5 py-6", digit: "bg-shop-fill" },
} as const

/**
 * The time left until an instant: days, hours, minutes and seconds, under its words.
 *
 * `role="timer"`, whose live region is off: nothing is announced every second. A reader hears the end
 * once, as a date — "Termina em 30 de setembro, às 23:59" — and the ticking digits are hidden from it.
 * Before the script runs the digits wait as dashes, since the server's clock is not the visitor's; the
 * date is there from the start.
 */
export function StorefrontCountdown({
  layout,
  title,
  subtitle,
  endsAt,
  now,
  bleed = false,
  ended = false,
  timeZone = SHOP_TIME_ZONE,
  className,
  messages = defaultMessages,
}: StorefrontCountdownProps) {
  const text = messages.storefront
  const end = Date.parse(endsAt)
  const left = now === null ? null : remainingOf(end, now)
  const date = new Intl.DateTimeFormat(messages.locale, { day: "numeric", month: "long", timeZone }).format(end)
  const time = new Intl.DateTimeFormat(messages.locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(end)
  const look = LAYOUT[layout]
  const units = [
    { key: "days", value: left?.days, label: text.countdownUnits.days },
    { key: "hours", value: left?.hours, label: text.countdownUnits.hours },
    { key: "minutes", value: left?.minutes, label: text.countdownUnits.minutes },
    { key: "seconds", value: left?.seconds, label: text.countdownUnits.seconds },
  ]

  return (
    <div role="timer" className={cn("flex flex-col items-center gap-4 text-center", look.box, layout === "BAND" && !bleed && "rounded-2xl", className)}>
      {title ? <h2 className="text-xl font-semibold text-balance shop-sm:text-2xl">{title}</h2> : null}
      {subtitle ? <p className="max-w-xl text-sm opacity-85">{subtitle}</p> : null}
      {ended ? <p className="rounded-full border border-current px-3 py-0.5 text-xs font-semibold uppercase">{text.countdownEnded}</p> : null}
      <p className={cn("text-sm", left ? "sr-only" : "opacity-85")}>{format(text.countdownEnds, { date, time })}</p>
      <div aria-hidden="true" className="flex gap-2 shop-sm:gap-3">
        {units.map((unit) => (
          <span key={unit.key} className={cn("flex min-w-14 flex-col items-center rounded-xl px-2 py-2 shop-sm:min-w-16", look.digit)}>
            <span className="text-2xl leading-none font-bold tabular-nums shop-sm:text-3xl">
              {unit.value === undefined ? "--" : String(unit.value).padStart(2, "0")}
            </span>
            <span className="mt-1 text-[11px] tracking-wide uppercase opacity-80">{unit.label}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
