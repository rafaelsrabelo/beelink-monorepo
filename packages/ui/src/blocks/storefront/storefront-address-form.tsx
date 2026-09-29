"use client"

// React
import { useId, useRef, useState } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

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

/** What a ZIP code lookup answers: the parts it knows, or why it knows none. */
export type StorefrontZipCodeLookup =
  | { status: "found"; street: string | null; neighborhood: string | null; city: string | null; state: string | null }
  | { status: "not-found" }
  | { status: "unavailable" }

export interface StorefrontAddressFormProps {
  address: StorefrontAddressFormValues
  /** The shopper's name: who receives when the field is left blank. */
  shopperName: string
  /** Where the address posts; the web's route handler. */
  action: string
  /** Carried through the post: where to come back to. */
  hidden?: Readonly<Record<string, string>>
  cancelHref: string
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
 * holding it to a ZIP code, a street, a city and a state. With a script, "Buscar CEP" fills what the
 * postcode service knows and moves on to the number; without one, every part is typed.
 */
export function StorefrontAddressForm({
  address,
  shopperName,
  action,
  hidden = {},
  cancelHref,
  offerDefault,
  error,
  onZipCodeLookup,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontAddressFormProps) {
  const text = messages.storefront
  const headingId = useId()
  const form = useRef<HTMLFormElement>(null)
  const [lookup, setLookup] = useState<{ pending: boolean; said: string | null }>({ pending: false, said: null })

  const input = (name: string) => form.current?.elements.namedItem(name) as HTMLInputElement | null

  async function lookUp() {
    const zipCode = input("zipCode")?.value ?? ""
    if (!onZipCodeLookup || lookup.pending) return
    setLookup({ pending: true, said: null })
    const found = await onZipCodeLookup(zipCode)
    if (found.status !== "found") {
      setLookup({ pending: false, said: found.status === "not-found" ? text.addressLookupNotFound : text.addressLookupFailed })
      input("zipCode")?.focus()
      return
    }
    for (const part of LOOKED_UP) {
      const field = input(part)
      if (field && found[part]) field.value = found[part]
    }
    setLookup({ pending: false, said: null })
    const next = NEXT_AFTER_LOOKUP.map(input).find((field) => field !== null && field.value === "")
    ;(next ?? input("number"))?.focus()
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
    <section aria-labelledby={headingId} className="flex w-full max-w-3xl flex-col gap-5 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background">
      <h2 id={headingId} className="text-base font-bold">
        {address.id ? text.addressFormEdit : text.addressFormNew}
      </h2>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}

      <form ref={form} action={action} method="post" className="grid grid-cols-6 gap-4">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {address.id ? <input type="hidden" name="id" value={address.id} /> : null}

        <div className="col-span-6 shop-md:col-span-3">
          {field("label", text.addressLabel, { maxLength: 40, placeholder: text.addressLabelPlaceholder, autoComplete: "off" }, text.addressLabelHint)}
        </div>
        <div className="col-span-6 shop-md:col-span-3">
          {field("recipientName", text.addressRecipient, { maxLength: 120, placeholder: shopperName, autoComplete: "name" }, text.addressRecipientHint)}
        </div>

        <div className="col-span-6 flex flex-col gap-1 shop-sm:col-span-3">
          {field("zipCode", text.accountZipCode, {
            required: true,
            inputMode: "numeric",
            pattern: "\\d{5}-?\\d{3}",
            // Room for a CEP typed with a dot, so the browser says the format rather than cutting it short.
            maxLength: 10,
            title: text.addressZipCodeFormat,
            autoComplete: "postal-code",
          })}
          {onZipCodeLookup ? (
            // Not `disabled`: a button disabled under the focus drops it to the page's start.
            <button
              type="button"
              onClick={lookUp}
              aria-busy={lookup.pending || undefined}
              aria-disabled={lookup.pending || undefined}
              className="self-start text-sm font-semibold text-shop-primary-ink hover:underline aria-disabled:opacity-60"
            >
              {lookup.pending ? text.addressLookupPending : text.addressLookup}
            </button>
          ) : null}
          {/* Always in the page, so what the lookup says is heard when its words arrive. */}
          <p role="status" className="text-xs text-shop-muted">
            {lookup.said}
          </p>
        </div>
        <div className="col-span-6">{field("street", text.accountStreet, { required: true, maxLength: 160, autoComplete: "address-line1" })}</div>
        <div className="col-span-2">{field("number", text.accountNumber, { maxLength: 20 })}</div>
        <div className="col-span-4">{field("complement", text.accountComplement, { maxLength: 80, autoComplete: "address-line2" })}</div>
        <div className="col-span-6 shop-sm:col-span-3">{field("neighborhood", text.accountNeighborhood, { maxLength: 80 })}</div>
        <div className="col-span-4 shop-sm:col-span-2">{field("city", text.accountCity, { required: true, maxLength: 80, autoComplete: "address-level2" })}</div>
        <div className="col-span-2 shop-sm:col-span-1">{field("state", text.accountState, { required: true, maxLength: 2, pattern: "[A-Za-z]{2}", title: text.addressStateFormat, autoComplete: "address-level1" })}</div>

        {offerDefault ? (
          <label className="col-span-6 flex items-center gap-2 text-sm">
            <input type="checkbox" name="isDefault" value="1" className="size-4 accent-shop-primary" />
            {text.addressMakeDefault}
          </label>
        ) : null}

        <div className="col-span-6 flex flex-wrap items-center gap-4">
          <button type="submit" className="h-12 grow rounded-xl bg-shop-primary px-6 text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90">
            {text.addressSave}
          </button>
          <Link href={cancelHref} className="text-sm font-semibold text-shop-muted hover:underline">
            {text.addressCancel}
          </Link>
        </div>
      </form>
    </section>
  )
}
