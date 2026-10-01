"use client"

// React
import { useId } from "react"

// UI
import { FieldDescription, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { DiscountAudienceValue } from "@harness-monorepo/ui/lib/discount-form"

export interface DiscountAudienceFieldProps {
  audience: DiscountAudienceValue
  onChange: (patch: { audience: DiscountAudienceValue }) => void
  disabled?: boolean
  messages?: UiMessages
}

const AUDIENCES = ["EVERYONE", "FIRST_PURCHASE"] as const satisfies readonly DiscountAudienceValue[]
/** The primitive's pressed grey is lost against the panel's surface; a choice has to read as chosen. */
const PRESSED = "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"

/**
 * Who a promotion or a coupon is for: every customer, or only one on their first purchase at the shop.
 *
 * What counts as a first purchase is said under the choice only once it is the one made: under
 * "everyone" the same sentence would read as what that choice means.
 */
export function DiscountAudienceField({ audience, onChange, disabled = false, messages = defaultMessages }: DiscountAudienceFieldProps) {
  const text = messages.discounts
  const id = useId()
  const label: Record<DiscountAudienceValue, string> = { EVERYONE: text.audienceEveryone, FIRST_PURCHASE: text.audienceFirstPurchase }
  const help = audience === "FIRST_PURCHASE" ? text.audienceFirstPurchaseHelp : null

  return (
    <FieldSet className="flex flex-col gap-2">
      <FieldLegend variant="label">{text.audienceLabel}</FieldLegend>
      <ToggleGroup
        value={[audience]}
        // Pressing the chosen one again would leave none; a discount is always for someone.
        onValueChange={(next: string[]) => {
          const chosen = AUDIENCES.find((option) => option === next[0])
          if (chosen) onChange({ audience: chosen })
        }}
        disabled={disabled}
        className="flex-wrap"
      >
        {AUDIENCES.map((option) => (
          <ToggleGroupItem key={option} value={option} variant="outline" className={PRESSED} aria-describedby={help && option === audience ? `${id}-help` : undefined}>
            {label[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {/*
        In the page before there is anything to say, so a reader hears the sentence arrive when the
        first purchase is chosen: the focus stays on the button pressed. The margin only takes back
        the gap an empty line would leave.
      */}
      <div aria-live="polite" className="empty:-mt-2">
        {help ? <FieldDescription id={`${id}-help`}>{help}</FieldDescription> : null}
      </div>
    </FieldSet>
  )
}
