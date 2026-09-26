"use client"

// React
import { useId } from "react"

// UI
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ORDER_NOTE_MAX_LENGTH, type OrderDetailsIssues, type OrderDetailsValues } from "@harness-monorepo/ui/lib/order-form"
import type { OrderFulfillmentValue, OrderPaymentValue } from "./order-types"

export interface OrderDetailsFieldsProps {
  value: OrderDetailsValues
  onChange: (value: OrderDetailsValues) => void
  /** The methods this shop accepts, in its own order: the API refuses any other. */
  paymentMethods: readonly OrderPaymentValue[]
  /** `yyyy-mm-dd` in the shopkeeper's calendar: the latest an order can be dated. */
  today: string
  issues?: OrderDetailsIssues
  messages?: UiMessages
}

const FULFILLMENTS = ["DELIVERY", "PICKUP"] as const satisfies readonly OrderFulfillmentValue[]

/** The primitive's pressed grey is lost against the panel's surface; a choice has to read as chosen. */
const PRESSED = "aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"

/** How the order leaves and is paid for, what was taken off, what was said, and when it was closed. */
export function OrderDetailsFields({ value, onChange, paymentMethods, today, issues = {}, messages = defaultMessages }: OrderDetailsFieldsProps) {
  const text = messages.orders.form
  const labels = messages.orders
  const id = useId()
  const set = (patch: Partial<OrderDetailsValues>) => onChange({ ...value, ...patch })

  return (
    <div className="flex flex-col gap-5">
      <FieldSet className="flex flex-col gap-2">
        <FieldLegend variant="label">{text.fulfillment}</FieldLegend>
        <ToggleGroup
          value={[value.fulfillment]}
          // Pressing the chosen one again would leave none; an order always leaves one way.
          onValueChange={(next: string[]) => {
            const chosen = FULFILLMENTS.find((option) => option === next[0])
            if (chosen) set({ fulfillment: chosen })
          }}
          className="flex-wrap"
        >
          {FULFILLMENTS.map((option) => (
            <ToggleGroupItem key={option} value={option} variant="outline" className={PRESSED}>
              {labels.fulfillments[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </FieldSet>

      {value.fulfillment === "DELIVERY" ? (
        <Field data-invalid={issues.deliveryFee ? true : undefined} className="max-w-48">
          <FieldLabel htmlFor={`${id}-fee`}>{text.deliveryFee}</FieldLabel>
          <Input
            id={`${id}-fee`}
            inputMode="decimal"
            placeholder="0,00"
            value={value.deliveryFee}
            aria-invalid={issues.deliveryFee ? true : undefined}
            onChange={(event) => set({ deliveryFee: event.target.value })}
          />
          <FieldError>{issues.deliveryFee}</FieldError>
        </Field>
      ) : null}

      <FieldSet className="flex flex-col gap-2">
        <FieldLegend variant="label">{text.payment}</FieldLegend>
        <ToggleGroup
          value={value.paymentMethod ? [value.paymentMethod] : []}
          onValueChange={(next: string[]) => {
            const chosen = paymentMethods.find((method) => method === next[0])
            if (chosen) set({ paymentMethod: chosen })
          }}
          className="flex-wrap"
        >
          {paymentMethods.map((method) => (
            <ToggleGroupItem key={method} value={method} variant="outline" className={PRESSED}>
              {labels.payments[method]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <FieldError>{issues.paymentMethod}</FieldError>
      </FieldSet>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={issues.discount ? true : undefined}>
          <FieldLabel htmlFor={`${id}-discount`}>{text.discount}</FieldLabel>
          <Input
            id={`${id}-discount`}
            inputMode="decimal"
            placeholder="0,00"
            value={value.discount}
            aria-invalid={issues.discount ? true : undefined}
            onChange={(event) => set({ discount: event.target.value })}
          />
          <FieldError>{issues.discount}</FieldError>
        </Field>
        <Field data-invalid={issues.placedOn ? true : undefined}>
          <FieldLabel htmlFor={`${id}-placed`}>{text.placedAt}</FieldLabel>
          <Input
            id={`${id}-placed`}
            type="date"
            max={today}
            required
            value={value.placedOn}
            aria-invalid={issues.placedOn ? true : undefined}
            onChange={(event) => set({ placedOn: event.target.value })}
          />
          <FieldError>{issues.placedOn}</FieldError>
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={`${id}-note`}>{text.note}</FieldLabel>
        <Textarea
          id={`${id}-note`}
          maxLength={ORDER_NOTE_MAX_LENGTH}
          rows={3}
          placeholder={text.notePlaceholder}
          value={value.note}
          onChange={(event) => set({ note: event.target.value })}
        />
      </Field>
    </div>
  )
}
