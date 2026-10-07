// Libs
import { cn } from "@harness-monorepo/ui/lib/utils"

// UI
import { toggleVariants } from "@harness-monorepo/ui/components/toggle"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink } from "../auth/auth-link"
import type { LinkComponent } from "../auth/auth-link"

export interface ReportPeriodOption {
  /** How many days, ending today. */
  days: number
  /** The page's own address with this period on it. The screen builds it. */
  href: string
}

export interface ReportPeriodPickerProps {
  options: readonly ReportPeriodOption[]
  /** The period on screen. */
  current: number
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The periods a report offers (BEELINK-275), as links: the period is in the page's address, so each
 * choice is a place to go — one Back undoes it, and a filtered report can be sent to someone. Drawn
 * like the panel's toggles; the one on screen is said with `aria-current`.
 */
export function ReportPeriodPicker({ options, current, linkComponent: Link = AnchorLink, messages = defaultMessages }: ReportPeriodPickerProps) {
  const text = messages.reports.salesByOrigin

  return (
    <nav aria-label={text.periodLabel}>
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => (
          <li key={option.days}>
            <Link
              href={option.href}
              aria-current={option.days === current ? "true" : undefined}
              className={cn(toggleVariants({ variant: "outline" }), "aria-[current=true]:bg-muted aria-[current=true]:text-foreground")}
            >
              {format(text.periodDays, { days: String(option.days) })}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
