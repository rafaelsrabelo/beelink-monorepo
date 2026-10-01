"use client"

// React
import { useEffect, useId, useRef, useState, type FormEvent } from "react"

// Libs
import { TicketCheckIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** The same ceiling the API holds a code to; past it nothing could match. */
const CODE_MAX_LENGTH = 30

export interface StorefrontCouponProps {
  /** The coupon in force, as the shop stores it; null with none, and the field is offered. */
  applied: string | null
  /** The one in force is counting in the totals above. False while it is checked again, or does not hold. */
  holding?: boolean
  /** A code is being checked: nothing is pressed twice. A code taken is `applied` by the time this clears. */
  pending?: boolean
  /** Why the code just tried was not taken, or why the one in force does not hold now; already in words. */
  error?: string | null
  onApply?: (code: string) => void
  onRemove?: () => void
  /** The shopper is typing again: what was said of the last code no longer describes the field. */
  onEdit?: () => void
  /** The order is on its way: the coupon is no longer changed. */
  disabled?: boolean
  /** Nobody is signed in: a sentence says where the code goes, and no field is offered. */
  signedOut?: boolean
  messages?: UiMessages
}

const BUTTON =
  "h-11 shrink-0 rounded-[10px] border border-shop-line-strong px-4 text-sm font-semibold text-shop-primary-ink hover:bg-shop-fill disabled:cursor-not-allowed disabled:opacity-50"

/**
 * "Cupom de desconto", in the cart's summary (BEELINK-194). A code is typed and applied, and the
 * answer is said here before the order is placed: taken, or why not. One in force is a chip with a
 * way to take it off — and keeps saying why when the cart moved from under it.
 *
 * The typed text is the block's own; whether a code holds is the screen's, which asked the API.
 * Focus follows what the press did: to "Remover" once a code is in, back to the field once it is out
 * — the control that was pressed is gone by then.
 */
export function StorefrontCoupon({
  applied,
  holding = false,
  pending = false,
  error,
  onApply,
  onRemove,
  onEdit,
  disabled = false,
  signedOut = false,
  messages = defaultMessages,
}: StorefrontCouponProps) {
  const text = messages.storefront
  const id = useId()
  const [typed, setTyped] = useState("")
  const input = useRef<HTMLInputElement>(null)
  const remove = useRef<HTMLButtonElement>(null)
  /** Set by a press here, so focus moves only for what the shopper did — never on the first draw. */
  const acted = useRef(false)

  useEffect(() => {
    if (pending || !acted.current) return
    acted.current = false
    // Taken: its chip's button. Refused or taken off: the field, where the next code is typed.
    ;(applied ? remove.current : input.current)?.focus()
  }, [applied, pending])

  if (signedOut) return <p className="text-sm text-shop-muted">{text.couponSignedOut}</p>

  const code = typed.trim()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code || pending || disabled) return
    acted.current = true
    onApply?.(code)
  }

  return (
    <div className="flex flex-col gap-2">
      {applied ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{text.couponLabel}</p>
          <div className="flex items-center gap-2 rounded-[10px] border border-shop-line bg-shop-fill px-3 py-1">
            <TicketCheckIcon aria-hidden="true" className="size-4 shrink-0 text-shop-muted" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{applied}</span>
            <button
              ref={remove}
              type="button"
              disabled={disabled}
              aria-label={format(text.couponRemoveNamed, { code: applied })}
              onClick={() => {
                acted.current = true
                setTyped("")
                onRemove?.()
              }}
              className="min-h-11 shrink-0 text-sm font-semibold text-shop-primary-ink hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {text.couponRemove}
            </button>
          </div>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor={`${id}-code`} className="text-sm font-semibold">
            {text.couponLabel}
          </label>
          <div className="flex gap-2">
            <input
              ref={input}
              id={`${id}-code`}
              value={typed}
              maxLength={CODE_MAX_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder={text.couponPlaceholder}
              // Read-only and not disabled while it is checked: the focus stays where the shopper left it.
              readOnly={pending}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => {
                setTyped(event.target.value)
                onEdit?.()
              }}
              className="h-11 min-w-0 flex-1 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background uppercase placeholder:normal-case"
            />
            <button type="submit" disabled={!code || pending || disabled} aria-busy={pending || undefined} className={BUTTON}>
              {pending ? text.couponChecking : text.couponApply}
            </button>
          </div>
        </form>
      )}
      {/*
        In the page before there is anything to say, so a reader hears the sentence arrive and not a
        region appear. A live region and not a `status`: empty, it is nothing to land on, and the
        cart's own status — a product that left the shop — stays the only one.
      */}
      <p aria-live="polite" aria-atomic="true" className="text-sm text-shop-positive-ink empty:hidden">
        {applied && holding && !error ? format(text.couponApplied, { code: applied }) : null}
      </p>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}
    </div>
  )
}
