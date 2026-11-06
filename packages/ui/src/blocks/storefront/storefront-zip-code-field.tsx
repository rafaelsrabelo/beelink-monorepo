"use client"

// React
import { useId, useRef, useState, type ChangeEvent } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** What a postcode service knows of a CEP it found. */
export interface StorefrontZipCodeFound {
  street: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

/** What a ZIP code lookup answers: the parts it knows, or why it knows none. */
export type StorefrontZipCodeLookup = ({ status: "found" } & StorefrontZipCodeFound) | { status: "invalid" } | { status: "not-found" } | { status: "unavailable" }

export interface StorefrontZipCodeFieldProps {
  /** The CEP the form starts with; null for none. */
  defaultValue: string | null
  /** Asks the postcode service; absent, the CEP is typed like any field and nothing is looked up. */
  onLookup?: (zipCode: string) => Promise<StorefrontZipCodeLookup>
  /** What a found CEP knows, for the form to write into its own fields. */
  onFound: (found: StorefrontZipCodeFound) => void
  /** The service does not know the CEP, or did not answer: the rest of the address is typed by hand. */
  onMissed?: () => void
  /** Opened by the shopper's own tap: the keyboard comes up on the CEP. Never on a page's load. */
  autoFocus?: boolean
  inputClassName: string
  labelClassName: string
  messages?: UiMessages
}

const CEP_DIGITS = 8

/** "60160230" as "60160-230", and as far as it goes while it is typed. */
function maskOf(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

/**
 * The CEP of an address form, posted as `zipCode`. With a lookup, the eighth digit asks the postcode
 * service at once — nobody has to find a button on a phone — and a press of "Buscar CEP" asks again
 * after a failure. A CEP too short to be one is said as such before anything is asked; one the
 * service does not know, and the service not answering, each have their own sentence, and the
 * address is still typed by hand.
 */
export function StorefrontZipCodeField({ defaultValue, onLookup, onFound, onMissed, autoFocus = false, inputClassName, labelClassName, messages = defaultMessages }: StorefrontZipCodeFieldProps) {
  const text = messages.storefront
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  // The CEP each answer was asked for: an answer to a CEP since changed is not written anywhere.
  const asked = useRef<string | null>(null)
  const [lookup, setLookup] = useState<{ pending: boolean; said: string | null }>({ pending: false, said: null })

  const digitsOf = () => (input.current?.value ?? "").replace(/\D/g, "")

  async function lookUp(digits: string) {
    if (!onLookup) return
    if (digits.length !== CEP_DIGITS) {
      setLookup({ pending: false, said: text.addressLookupInvalid })
      return input.current?.focus()
    }
    asked.current = digits
    setLookup({ pending: true, said: null })
    const found = await onLookup(digits)
    if (asked.current !== digits) return
    if (found.status === "found") {
      setLookup({ pending: false, said: null })
      return onFound(found)
    }
    setLookup({ pending: false, said: found.status === "invalid" ? text.addressLookupInvalid : found.status === "not-found" ? text.addressLookupNotFound : text.addressLookupFailed })
    input.current?.focus()
    if (found.status !== "invalid") onMissed?.()
  }

  function typed(event: ChangeEvent<HTMLInputElement>) {
    const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, CEP_DIGITS)
    const masked = maskOf(digits)
    if (event.currentTarget.value !== masked) event.currentTarget.value = masked
    if (digits.length === CEP_DIGITS && digits !== asked.current) void lookUp(digits)
    else if (digits.length < CEP_DIGITS) {
      // A CEP being changed is no longer the one any sentence, or any lookup on its way, was about.
      asked.current = null
      if (lookup.said || lookup.pending) setLookup({ pending: false, said: null })
    }
  }

  function left() {
    const digits = digitsOf()
    if (onLookup && digits.length > 0 && digits.length < CEP_DIGITS) setLookup({ pending: false, said: text.addressLookupInvalid })
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-zip`} className={labelClassName}>
        {text.accountZipCode}
      </label>
      <input
        ref={input}
        id={`${id}-zip`}
        name="zipCode"
        defaultValue={defaultValue ? maskOf(defaultValue.replace(/\D/g, "").slice(0, CEP_DIGITS)) : ""}
        required
        inputMode="numeric"
        pattern="\d{5}-?\d{3}"
        // Room for a CEP pasted with a dot, which the browser would otherwise cut before the mask reads it.
        maxLength={10}
        title={text.addressZipCodeFormat}
        autoComplete="postal-code"
        // Mounted by the shopper's own tap alone: a form open on arrival never pulls the keyboard up.
        autoFocus={autoFocus}
        aria-describedby={`${id}-said`}
        onChange={typed}
        onBlur={left}
        className={inputClassName}
      />
      {onLookup ? (
        // Not `disabled`: a button disabled under the focus drops it to the page's start.
        <button
          type="button"
          onClick={() => void lookUp(digitsOf())}
          aria-busy={lookup.pending || undefined}
          aria-disabled={lookup.pending || undefined}
          className="min-h-11 self-start text-sm font-semibold text-shop-primary-ink hover:underline aria-disabled:opacity-60"
        >
          {lookup.pending ? text.addressLookupPending : text.addressLookup}
        </button>
      ) : null}
      {/* Always in the page, so what the lookup says is heard when its words arrive. */}
      <p id={`${id}-said`} role="status" className="text-xs text-shop-muted">
        {lookup.said}
      </p>
    </div>
  )
}
