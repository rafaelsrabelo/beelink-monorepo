"use client"

// React
import { useId, useState, type FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { ToggleGroup, ToggleGroupItem } from "@harness-monorepo/ui/components/toggle-group"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderDeliveryKindValue, OrderDeliveryValue } from "./order-types"

export interface OrderDeliveryCardProps {
  /** What was told, or null; the form starts from it — key the card by it to start over once it changes. */
  delivery: OrderDeliveryValue | null
  onSave: (delivery: OrderDeliveryValue) => void
  onClear: () => void
  pending?: boolean
  /** Why the last save did not go through, in words. */
  error?: string | null
  /** The last save went through. */
  saved?: boolean
  /** Out for delivery with nothing told: the card asks for it. */
  needed?: boolean
  messages?: UiMessages
}

const KINDS: readonly OrderDeliveryKindValue[] = ["OWN", "CARRIER"]
const PRESSED = "data-[pressed]:bg-primary data-[pressed]:text-primary-foreground"

/** A field's text as the wire wants it: nothing typed is null. */
const orNull = (value: string) => value.trim() || null

/**
 * How a delivery goes, told on the opened order (J7): who brings it, the carrier and its service,
 * the tracking, and the window it should arrive in. Never required to move the status: a shop that
 * delivers by motorbike has no code, and says so by leaving it empty.
 */
export function OrderDeliveryCard({ delivery, onSave, onClear, pending = false, error, saved = false, needed = false, messages = defaultMessages }: OrderDeliveryCardProps) {
  const text = messages.orders.detail
  const id = useId()
  const [draft, setDraft] = useState({
    kind: delivery?.kind ?? ("OWN" as OrderDeliveryKindValue),
    carrier: delivery?.carrier ?? "",
    service: delivery?.service ?? "",
    trackingCode: delivery?.trackingCode ?? "",
    trackingUrl: delivery?.trackingUrl ?? "",
    estimateFrom: delivery?.estimateFrom ?? "",
    estimateTo: delivery?.estimateTo ?? "",
  })
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }))
  const carrier = draft.kind === "CARRIER"

  function save(event: FormEvent) {
    event.preventDefault()
    onSave({
      kind: draft.kind,
      carrier: carrier ? orNull(draft.carrier) : null,
      service: carrier ? orNull(draft.service) : null,
      trackingCode: orNull(draft.trackingCode),
      trackingUrl: orNull(draft.trackingUrl),
      estimateFrom: orNull(draft.estimateFrom),
      estimateTo: orNull(draft.estimateTo),
    })
  }

  return (
    <section aria-labelledby={`${id}-title`} className={cn("flex flex-col gap-4 rounded-xl border p-4", needed && "border-primary ring-primary/30 ring-2")}>
      <h2 id={`${id}-title`} className="font-semibold">
        {text.deliveryTitle}
      </h2>
      {needed ? <p className="text-sm">{text.deliveryNeeded}</p> : null}

      <form onSubmit={save} className="flex flex-col gap-4">
        <FieldSet className="flex flex-col gap-2">
          <FieldLegend variant="label">{text.deliveryKind}</FieldLegend>
          <ToggleGroup
            value={[draft.kind]}
            onValueChange={(next: string[]) => {
              const chosen = KINDS.find((kind) => kind === next[0])
              if (chosen) set({ kind: chosen })
            }}
            className="flex-wrap"
          >
            {KINDS.map((kind) => (
              <ToggleGroupItem key={kind} value={kind} variant="outline" className={PRESSED}>
                {text.deliveryKinds[kind]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>

        {carrier ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${id}-carrier`}>{text.deliveryCarrier}</FieldLabel>
              <Input id={`${id}-carrier`} maxLength={60} placeholder="Correios" value={draft.carrier} onChange={(event) => set({ carrier: event.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-service`}>{text.deliveryService}</FieldLabel>
              <Input id={`${id}-service`} maxLength={60} placeholder="SEDEX" value={draft.service} onChange={(event) => set({ service: event.target.value })} />
            </Field>
          </div>
        ) : null}

        <Field>
          <FieldLabel htmlFor={`${id}-code`}>{text.deliveryCode}</FieldLabel>
          <Input id={`${id}-code`} maxLength={60} autoCapitalize="characters" value={draft.trackingCode} onChange={(event) => set({ trackingCode: event.target.value })} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-link`}>{text.deliveryLink}</FieldLabel>
          <Input id={`${id}-link`} type="url" maxLength={500} placeholder="https://" value={draft.trackingUrl} onChange={(event) => set({ trackingUrl: event.target.value })} />
          <FieldDescription>{text.deliveryLinkHint}</FieldDescription>
        </Field>

        <FieldSet className="flex flex-col gap-2">
          <FieldLegend variant="label">{text.deliveryWindow}</FieldLegend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`${id}-from`}>{text.deliveryFrom}</FieldLabel>
              <Input id={`${id}-from`} type="date" value={draft.estimateFrom} onChange={(event) => set({ estimateFrom: event.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-until`}>{text.deliveryUntil}</FieldLabel>
              <Input id={`${id}-until`} type="date" min={draft.estimateFrom || undefined} value={draft.estimateTo} onChange={(event) => set({ estimateTo: event.target.value })} />
            </Field>
          </div>
        </FieldSet>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {saved && !error ? text.deliverySaved : null}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {text.deliverySave}
          </Button>
          {delivery ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={onClear}>
              {text.deliveryClear}
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
