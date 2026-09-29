"use client"

// React
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

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
  /** What was told, or null. The form starts from it, and over again whenever a save or a removal changes it. */
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

/** The form's fields, from what was told: nothing told is an empty field. */
function draftOf(delivery: OrderDeliveryValue | null) {
  return {
    kind: delivery?.kind ?? ("OWN" as OrderDeliveryKindValue),
    carrier: delivery?.carrier ?? "",
    service: delivery?.service ?? "",
    trackingCode: delivery?.trackingCode ?? "",
    trackingUrl: delivery?.trackingUrl ?? "",
    estimateFrom: delivery?.estimateFrom ?? "",
    estimateTo: delivery?.estimateTo ?? "",
  }
}

/**
 * How a delivery goes, told on the opened order (J7): who brings it, the carrier and its service,
 * the tracking, and the window it should arrive in. Never required to move the status: a shop that
 * delivers by motorbike has no code, and says so by leaving it empty.
 */
export function OrderDeliveryCard({ delivery, onSave, onClear, pending = false, error, saved = false, needed = false, messages = defaultMessages }: OrderDeliveryCardProps) {
  const text = messages.orders.detail
  const id = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const refocus = useRef(false)
  const [seen, setSeen] = useState(delivery)
  const [draft, setDraft] = useState(() => draftOf(delivery))
  const [edited, setEdited] = useState(false)
  // Started over in the render a save or a removal lands in, never remounted: the fields, the focus
  // and the live region that says "Entrega salva." all stay where they are.
  if (delivery !== seen) {
    setSeen(delivery)
    setDraft(draftOf(delivery))
    setEdited(false)
  }
  const set = (patch: Partial<ReturnType<typeof draftOf>>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setEdited(true)
  }
  const carrier = draft.kind === "CARRIER"

  // "Remover" goes with what it removed: focus lands on the card's title instead of the page's start.
  useEffect(() => {
    if (delivery || !refocus.current) return
    refocus.current = false
    heading.current?.focus()
  }, [delivery])

  function save(event: FormEvent) {
    event.preventDefault()
    // The button stays focusable while saving, so Enter in a field could send it twice.
    if (pending) return
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
    <section
      aria-labelledby={`${id}-title`}
      className={cn("bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs", needed && "border-primary ring-primary/30 ring-2")}
    >
      <h2 id={`${id}-title`} ref={heading} tabIndex={-1} className="font-semibold outline-none">
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
          <Input
            id={`${id}-link`}
            type="url"
            maxLength={500}
            placeholder="https://"
            aria-describedby={`${id}-link-hint`}
            value={draft.trackingUrl}
            onChange={(event) => set({ trackingUrl: event.target.value })}
          />
          <FieldDescription id={`${id}-link-hint`}>{text.deliveryLinkHint}</FieldDescription>
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
          {saved && !error && !edited ? text.deliverySaved : null}
        </p>

        <div className="flex flex-wrap gap-2">
          {/* Focusable while saving: a disabled button drops the focus to the page's start. */}
          <Button type="submit" disabled={pending} focusableWhenDisabled>
            {text.deliverySave}
          </Button>
          {delivery ? (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              focusableWhenDisabled
              onClick={() => {
                refocus.current = true
                onClear()
              }}
            >
              {text.deliveryClear}
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
