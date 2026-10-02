"use client"

// React
import { useId } from "react"

// Libs
import { CoinsIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontCashbackUseProps {
  /** What the shopper can spend now, in money: "R$ 15,00". */
  balance: string
  /** Their credit counts in the totals above. */
  checked: boolean
  /** The most this cart takes, in money, when it is less than the balance; null when it takes all of it. */
  cappedAt?: string | null
  /** The cart has nothing credit may pay for: the box is off, and says why. */
  nothingToPay?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** The order is on its way: the choice is no longer changed. */
  disabled?: boolean
  messages?: UiMessages
}

/**
 * "Usar meu cashback", in the cart's summary (BEELINK-244). Ticked, the cart is priced again with the
 * shopper's credit and its row shows in the totals before the order is placed — the most the cart
 * takes, which the sentence under the box says when it is less than what they have.
 */
export function StorefrontCashbackUse({ balance, checked, cappedAt = null, nothingToPay = false, onCheckedChange, disabled = false, messages = defaultMessages }: StorefrontCashbackUseProps) {
  const text = messages.storefront
  const id = useId()
  const note = nothingToPay ? text.cashbackUseNothing : checked && cappedAt ? format(text.cashbackUseCapped, { amount: cappedAt }) : null

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-shop-line px-3 py-2.5 has-checked:border-shop-primary has-disabled:cursor-not-allowed has-disabled:opacity-60"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked && !nothingToPay}
          disabled={disabled || nothingToPay}
          aria-describedby={note ? `${id}-note` : undefined}
          onChange={(event) => onCheckedChange?.(event.target.checked)}
          className="size-4 shrink-0 accent-shop-primary"
        />
        <CoinsIcon aria-hidden="true" className="size-4 shrink-0 text-shop-muted" />
        <span className="text-sm font-semibold">{format(text.cashbackUse, { amount: balance })}</span>
      </label>
      {/* In the page before there is anything to say, so a reader hears the sentence arrive and not a region appear. */}
      <p id={`${id}-note`} aria-live="polite" className="text-sm text-shop-muted empty:-mt-2">
        {note}
      </p>
    </div>
  )
}
