"use client"

// React
import { useId, type ReactNode } from "react"

// UI
import { Switch } from "@harness-monorepo/ui/components/switch"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface DeliveryModeCardProps {
  icon: ReactNode
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** The switch cannot move — a save in flight, or a mode this installation cannot offer. */
  disabled?: boolean
  /** What the mode holds; the form decides whether a mode switched off still shows anything. */
  children?: ReactNode
  messages?: UiMessages
}

/**
 * One way the shop gets an order out (BEELINK-177): a card with its switch in the corner, named by
 * the card's own title, and what that mode holds below it.
 */
export function DeliveryModeCard({ icon, title, description, checked, onCheckedChange, disabled = false, children, messages = defaultMessages }: DeliveryModeCardProps) {
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5">
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 id={`${id}-title`} className="font-semibold">
            {title}
          </h3>
          <p id={`${id}-description`} className="text-muted-foreground text-sm">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className="text-muted-foreground hidden text-sm sm:inline">
            {checked ? messages.delivery.on : messages.delivery.off}
          </span>
          <Switch
            checked={checked}
            disabled={disabled}
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-description`}
            onCheckedChange={(next: boolean) => onCheckedChange(next)}
          />
        </div>
      </div>
      {children}
    </section>
  )
}
