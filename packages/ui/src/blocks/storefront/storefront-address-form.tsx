"use client"

// React
import { useEffect, useId, useRef, useState } from "react"

// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { StorefrontZipCodeField, type StorefrontZipCodeFound, type StorefrontZipCodeLookup } from "./storefront-zip-code-field"

export type { StorefrontZipCodeLookup } from "./storefront-zip-code-field"

/** One saved address as its form starts: empty for a new one. */
export interface StorefrontAddressFormValues {
  /** Null: a new address. */
  id: string | null
  label: string | null
  recipientName: string | null
  zipCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

export interface StorefrontAddressFormProps {
  address: StorefrontAddressFormValues
  /** The shopper's name: who receives when the field is left blank. */
  shopperName: string
  /** Where the address posts; the web's route handler. */
  action: string
  /** Carried through the post: where to come back to. */
  hidden?: Readonly<Record<string, string>>
  /** Where "Cancelar" leads; with `onCancel` instead, it closes the form in place. Neither, and there is no way back to offer. */
  cancelHref?: string
  onCancel?: () => void
  /**
   * The checkout's own: the CEP first and only what a delivery needs — no name for the address,
   * nobody else receiving, no default to choose — saved as the address the order goes to. With a
   * lookup and nothing written yet, the CEP stands alone: the rest of the address appears once the
   * CEP was found — filled — or the service could not tell it — to be typed.
   */
  compact?: boolean
  /** Opened by the shopper's own tap: the keyboard comes up on the CEP. */
  autoFocus?: boolean
  /** Whether "Usar como endereço padrão" is offered: not on the first address, nor on the default itself. */
  offerDefault: boolean
  /** A refusal, already a sentence. */
  error?: string | null
  /** Fills the street, neighbourhood, city and state from the ZIP code; absent, there is no button to press. */
  onZipCodeLookup?: (zipCode: string) => Promise<StorefrontZipCodeLookup>
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const INPUT = "h-11 w-full rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background"
const LABEL = "flex flex-col gap-1 text-sm font-medium"
const LOOKED_UP = ["street", "neighborhood", "city", "state"] as const
/** Where the shopper goes on after a found CEP: the first of these still empty — a city-wide CEP names no street. */
const NEXT_AFTER_LOOKUP = ["street", "number"] as const

/**
 * One address of the shopper's, new or edited: a plain form that posts and comes back, the browser
 * holding it to a ZIP code, a street, a city and a state. With a script, the CEP fills what the
 * postcode service knows as soon as it is typed and moves on to the number; without one, every part
 * is typed. Whatever the lookup wrote stays an ordinary field, to be corrected.
 */
export function StorefrontAddressForm({
  address,
  shopperName,
  action,
  hidden = {},
  cancelHref,
  onCancel,
  compact = false,
  autoFocus = false,
  offerDefault,
  error,
  onZipCodeLookup,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontAddressFormProps) {
  const text = messages.storefront
  const headingId = useId()
  const form = useRef<HTMLFormElement>(null)
  // An address already written — one being edited — is shown whole, and so is any form with no lookup to wait for.
  const [revealed, setRevealed] = useState(!compact || !onZipCodeLookup || Boolean(address.zipCode || address.street))
  // A field to move on to once the rest of the address is drawn: hidden, it takes no focus.
  const focusAfterReveal = useRef(false)

  const input = (name: string) => form.current?.elements.namedItem(name) as HTMLInputElement | null
  const nextField = () => NEXT_AFTER_LOOKUP.map(input).find((field) => field !== null && field.value === "") ?? input("number")

  useEffect(() => {
    if (!revealed || !focusAfterReveal.current) return
    focusAfterReveal.current = false
    nextField()?.focus()
  }, [revealed])

  function found(parts: StorefrontZipCodeFound) {
    for (const part of LOOKED_UP) {
      const field = input(part)
      if (field && parts[part]) field.value = parts[part]
    }
    if (revealed) return nextField()?.focus()
    focusAfterReveal.current = true
    setRevealed(true)
  }

  const field = (name: keyof StorefrontAddressFormValues, label: string, extra: Record<string, string | number | boolean> = {}, hint?: string) => (
    <label className={LABEL}>
      <span>
        {label}
        {hint ? <span className="font-normal text-shop-muted"> · {hint}</span> : null}
      </span>
      <input name={name} defaultValue={address[name] ?? ""} className={INPUT} {...extra} />
    </label>
  )

  return (
    <section
      aria-labelledby={headingId}
      className={cn("flex w-full flex-col rounded-xl border border-shop-line bg-shop-background text-shop-on-background", compact ? "gap-3 p-4" : "max-w-3xl gap-5 p-6")}
    >
      <h2 id={headingId} className="text-base font-bold">
        {compact ? text.checkoutAddressFormTitle : address.id ? text.addressFormEdit : text.addressFormNew}
      </h2>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}

      <form ref={form} action={action} method="post" className={cn("grid grid-cols-6", compact ? "gap-x-3 gap-y-2.5" : "gap-4")}>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {address.id ? <input type="hidden" name="id" value={address.id} /> : null}

        {compact ? null : (
          <>
            <div className="col-span-6 shop-md:col-span-3">
              {field("label", text.addressLabel, { maxLength: 40, placeholder: text.addressLabelPlaceholder, autoComplete: "off" }, text.addressLabelHint)}
            </div>
            <div className="col-span-6 shop-md:col-span-3">
              {field("recipientName", text.addressRecipient, { maxLength: 120, placeholder: shopperName, autoComplete: "name" }, text.addressRecipientHint)}
            </div>
          </>
        )}

        <div className={compact ? "col-span-6" : "col-span-6 shop-sm:col-span-3"}>
          <StorefrontZipCodeField
            defaultValue={address.zipCode}
            {...(onZipCodeLookup ? { onLookup: onZipCodeLookup } : {})}
            onFound={found}
            onMissed={() => setRevealed(true)}
            autoFocus={autoFocus}
            inputClassName={INPUT}
            labelClassName="text-sm font-medium"
            messages={messages}
          />
        </div>
        {/* In the form while hidden: a found CEP writes into them before they are shown. */}
        <div hidden={!revealed} className="col-span-6">{field("street", text.accountStreet, { required: true, maxLength: 160, autoComplete: "address-line1" })}</div>
        <div hidden={!revealed} className="col-span-2">{field("number", text.accountNumber, { maxLength: 20 })}</div>
        <div hidden={!revealed} className="col-span-4">{field("complement", text.accountComplement, { maxLength: 80, autoComplete: "address-line2" })}</div>
        <div hidden={!revealed} className={compact ? "col-span-6" : "col-span-6 shop-sm:col-span-3"}>{field("neighborhood", text.accountNeighborhood, { maxLength: 80 })}</div>
        <div hidden={!revealed} className={compact ? "col-span-4" : "col-span-4 shop-sm:col-span-2"}>{field("city", text.accountCity, { required: true, maxLength: 80, autoComplete: "address-level2" })}</div>
        <div hidden={!revealed} className={compact ? "col-span-2" : "col-span-2 shop-sm:col-span-1"}>
          {field("state", text.accountState, { required: true, maxLength: 2, pattern: "[A-Za-z]{2}", title: text.addressStateFormat, autoComplete: "address-level1" })}
        </div>

        {offerDefault && !compact ? (
          <label className="col-span-6 flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDefault" value="1" className="size-4 accent-shop-primary" />
            {text.addressMakeDefault}
          </label>
        ) : null}

        <div className="col-span-6 flex flex-wrap items-center gap-4">
          {/* Not before the address is drawn: a hidden required field would hold the post and say nothing. */}
          {revealed ? (
            <button type="submit" className="h-12 grow rounded-xl bg-shop-primary px-6 text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90">
              {compact ? text.checkoutAddressUse : text.addressSave}
            </button>
          ) : null}
          {onCancel ? (
            <button type="button" onClick={onCancel} className="min-h-11 text-sm font-semibold text-shop-muted hover:underline">
              {text.addressCancel}
            </button>
          ) : cancelHref ? (
            <Link href={cancelHref} className="text-sm font-semibold text-shop-muted hover:underline">
              {text.addressCancel}
            </Link>
          ) : null}
        </div>
      </form>
    </section>
  )
}
