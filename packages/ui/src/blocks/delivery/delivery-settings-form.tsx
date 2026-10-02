"use client"

// React
import { useId, type FormEvent } from "react"

// Libs
import { BikeIcon, StoreIcon, TruckIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import type { DeliveryCarriersView, DeliveryMapView, DeliverySettingsFormValues, DeliverySettingsIssues } from "@harness-monorepo/ui/lib/delivery"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { MAP_ATTRIBUTION, StoreMap } from "../store/store-map"
import { DeliveryBandRows } from "./delivery-band-rows"
import { DeliveryCarriers } from "./delivery-carriers"
import { DeliveryModeCard } from "./delivery-mode-card"

export interface DeliverySettingsFormProps {
  value: DeliverySettingsFormValues
  onChange: (value: DeliverySettingsFormValues) => void
  onSubmit: () => void
  issues?: DeliverySettingsIssues
  /** Each band in words, worked out by the screen; null where a row does not read yet. */
  previews?: readonly (string | null)[]
  /** The shop's address in one line, where the customer collects; null while it has none. */
  pickupAddress: string | null
  /** Null when this installation draws no maps. */
  map: DeliveryMapView | null
  carriers: DeliveryCarriersView
  connectHref: string
  manageHref: string
  linkComponent?: LinkComponent
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  /** The last save went through and nothing was typed since. */
  saved?: boolean
  messages?: UiMessages
}

/**
 * How the shop gets an order to its customer (BEELINK-177): pickup, its own delivery by distance
 * bands, and carriers through Melhor Envio — each a card with its switch, combined as the shop
 * wants — and one save for the tab. Values are what was typed; the screen reads them, refuses what
 * does not hold field by field, and says why the API refused.
 */
export function DeliverySettingsForm({
  value,
  onChange,
  onSubmit,
  issues = {},
  previews,
  pickupAddress,
  map,
  carriers,
  connectHref,
  manageHref,
  linkComponent,
  pending = false,
  error,
  saved = false,
  messages = defaultMessages,
}: DeliverySettingsFormProps) {
  const text = messages.delivery
  const id = useId()
  const set = (patch: Partial<DeliverySettingsFormValues>) => onChange({ ...value, ...patch })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form noValidate onSubmit={submit} className="flex w-full flex-col gap-4">
      <p className="text-muted-foreground text-sm">{text.intro}</p>

      <DeliveryModeCard icon={<StoreIcon />} title={text.pickup.title} description={text.pickup.description} checked={value.pickupEnabled} onCheckedChange={(pickupEnabled) => set({ pickupEnabled })} disabled={pending} messages={messages}>
        {value.pickupEnabled ? <p className="text-sm">{pickupAddress ? format(text.pickup.address, { address: pickupAddress }) : text.pickup.noAddress}</p> : null}
      </DeliveryModeCard>

      <DeliveryModeCard icon={<BikeIcon />} title={text.own.title} description={text.own.description} checked={value.ownDeliveryEnabled} onCheckedChange={(ownDeliveryEnabled) => set({ ownDeliveryEnabled })} disabled={pending} messages={messages}>
        {value.ownDeliveryEnabled ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="flex flex-col gap-4">
              <DeliveryBandRows rows={value.bands} onChange={(bands) => set({ bands })} issues={issues.bands} previews={previews} disabled={pending} messages={messages} />
              {value.bands.length === 0 ? <p className="text-muted-foreground text-sm">{text.own.noBands}</p> : null}
              <Field data-invalid={issues.freeAbove ? true : undefined} className="max-w-64">
                <FieldLabel htmlFor={`${id}-free`}>{text.own.freeAbove}</FieldLabel>
                <Input
                  id={`${id}-free`}
                  inputMode="decimal"
                  placeholder="150,00"
                  value={value.freeAbove}
                  disabled={pending}
                  aria-invalid={issues.freeAbove ? true : undefined}
                  aria-describedby={`${id}-free-${issues.freeAbove ? "error" : "help"}`}
                  onChange={(event) => set({ freeAbove: event.target.value })}
                />
                {issues.freeAbove ? <FieldError id={`${id}-free-error`}>{issues.freeAbove}</FieldError> : <FieldDescription id={`${id}-free-help`}>{text.own.freeAboveHelp}</FieldDescription>}
              </Field>
            </div>
            <div className="flex flex-col gap-3">
              {map?.point ? (
                <StoreMap tileUrl={map.tileUrl} attribution={MAP_ATTRIBUTION} point={map.point} fallbackCenter={map.point} radiusMeters={map.radiusMeters} label={text.own.mapLabel} className="h-64 lg:h-80" />
              ) : map ? (
                <p className="bg-muted rounded-lg px-3 py-2 text-sm">{text.own.noPoint}</p>
              ) : null}
              <p className="text-muted-foreground text-sm">{text.own.straightLine}</p>
            </div>
          </div>
        ) : null}
      </DeliveryModeCard>

      <DeliveryModeCard
        icon={<TruckIcon />}
        title={text.carriers.title}
        description={text.carriers.description}
        checked={carriers.available && value.carriersEnabled}
        onCheckedChange={(carriersEnabled) => set({ carriersEnabled })}
        disabled={pending || !carriers.available}
        messages={messages}
      >
        <DeliveryCarriers view={carriers} connectHref={connectHref} manageHref={manageHref} linkComponent={linkComponent} messages={messages} />
      </DeliveryModeCard>

      <div className="bg-card border-border sticky bottom-0 flex flex-wrap items-center justify-end gap-3 rounded-lg border px-6 py-4 shadow-sm">
        {/* In the page before there is anything to say, so a reader hears the answer arrive. */}
        <p aria-live="polite" className={error ? "text-destructive mr-auto text-sm" : "text-muted-foreground mr-auto text-sm"}>
          {error ?? (saved ? text.saved : null)}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? text.saving : text.save}
        </Button>
      </div>
    </form>
  )
}
