"use client"

// React
import { useId } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { PaymentMethod } from "../store/store-types"

/** Mirrors the wire's `OrderPaymentChannel` and `OnlinePaymentMethod`; this package imports no contracts. */
export type CheckoutPaymentChannel = "OFFLINE" | "ONLINE"
export type CheckoutOnlineMethod = Extract<PaymentMethod, "PIX" | "CREDIT_CARD">

export interface StorefrontCheckoutPaymentValue {
  /** Absent is `OFFLINE`: settled with the shop, as before anything was charged here. */
  paymentChannel?: CheckoutPaymentChannel
  paymentMethod: PaymentMethod | null
  /** The instalments of a card charged online; absent is 1. */
  installments?: number
}

/** What the shop charges online for this cart, already in words (BEELINK-205). */
export interface StorefrontCheckoutOnline {
  methods: readonly CheckoutOnlineMethod[]
  /** Why none of them can be chosen for this cart — its total is under the least charged online; null when they can. */
  unavailable: string | null
  /** The instalments a card can be charged in for this total, each already written: "3x de R$ 40,00 sem juros". */
  installments: readonly { count: number; label: string }[]
  /** Said under an online way once chosen — the fee is still to be agreed, and the payment comes after it; null with nothing to say. */
  note: string | null
  /** The payer's CPF, asked while their record has none; null asks for none. */
  document: { value: string; onChange: (value: string) => void } | null
}

export interface StorefrontCheckoutPaymentProps<Value extends StorefrontCheckoutPaymentValue> {
  value: Value
  onChange: (value: Value) => void
  /** The shop's own labels, settled on delivery or at pickup; none when the shop turned that off. */
  offlineMethods: readonly PaymentMethod[]
  /** Null: the shop charges nothing online, and the checkout is the one of before. */
  online?: StorefrontCheckoutOnline | null
  /** The order has nothing to pay: said in place of every choice. */
  nothingToPay?: string | null
  disabled?: boolean
  messages?: UiMessages
}

const OPTION =
  "flex min-h-11 cursor-pointer items-start gap-3 rounded-[10px] border border-shop-line px-3 py-2.5 text-sm has-checked:border-shop-primary has-checked:bg-shop-primary-tint has-disabled:cursor-not-allowed has-disabled:opacity-60"
const RADIO = "mt-0.5 size-4 shrink-0 accent-shop-primary"
const FIELD = "h-10 rounded-[10px] border border-shop-line bg-shop-background px-3 text-sm"

/**
 * How the order is paid. Where the shop charges online — at its own Asaas account — Pix and the
 * credit card come first, under "Pagar agora": a card with its instalments, each at its amount and
 * with no interest, and the payer's CPF while their record has none. The shop's own labels follow,
 * settled on delivery or at pickup, unless the shop turned them off. A shop that charges nothing
 * online shows those labels alone, as it always did. Nothing is paid on this screen: an online way
 * chosen leads to the payment once the order is placed.
 */
export function StorefrontCheckoutPayment<Value extends StorefrontCheckoutPaymentValue>({
  value,
  onChange,
  offlineMethods,
  online = null,
  nothingToPay = null,
  disabled = false,
  messages = defaultMessages,
}: StorefrontCheckoutPaymentProps<Value>) {
  const text = messages.storefront
  const id = useId()
  const paysOnline = value.paymentChannel === "ONLINE"
  const both = online !== null && offlineMethods.length > 0
  const card = paysOnline && value.paymentMethod === "CREDIT_CARD"
  const hints = { PIX: text.checkoutPayPixHint, CREDIT_CARD: text.checkoutPayCardHint } as const

  if (nothingToPay) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{text.checkoutPayment}</p>
        <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-3 py-2 text-sm">
          {nothingToPay}
        </p>
      </div>
    )
  }

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">{text.checkoutPayment}</legend>

      {online ? (
        <div role="group" aria-labelledby={`${id}-now`} className="flex flex-col gap-2">
          {both ? (
            <p id={`${id}-now`} className="text-xs font-semibold text-shop-muted">
              {text.checkoutPayNow}
            </p>
          ) : (
            <span id={`${id}-now`} className="sr-only">
              {text.checkoutPayNow}
            </span>
          )}
          {online.methods.map((method) => (
            <label key={method} className={OPTION}>
              <input
                type="radio"
                name={`${id}-payment`}
                className={RADIO}
                checked={paysOnline && value.paymentMethod === method}
                disabled={online.unavailable !== null}
                onChange={() => onChange({ ...value, paymentChannel: "ONLINE", paymentMethod: method, installments: 1 })}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{messages.orders.payments[method]}</span>
                <span className="break-words text-xs text-shop-muted">{hints[method]}</span>
              </span>
            </label>
          ))}
          {online.unavailable ? (
            <p role="status" className="text-xs font-medium">
              {online.unavailable}
            </p>
          ) : null}
          {card && online.installments.length > 0 ? (
            <div className="flex flex-col gap-1 text-xs">
              <label htmlFor={`${id}-installments`} className="font-semibold">
                {text.checkoutInstallments}
              </label>
              <select
                id={`${id}-installments`}
                value={value.installments ?? 1}
                onChange={(event) => onChange({ ...value, installments: Number(event.target.value) })}
                className={FIELD}
              >
                {online.installments.map((each) => (
                  <option key={each.count} value={each.count}>
                    {each.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {paysOnline && online.note ? (
            <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-3 py-2 text-xs font-medium">
              {online.note}
            </p>
          ) : null}
          {paysOnline && online.document ? (
            <div className="flex flex-col gap-1 text-xs">
              <label htmlFor={`${id}-document`} className="font-semibold">
                {text.checkoutPayerDocument}
              </label>
              <input
                id={`${id}-document`}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={online.document.value}
                aria-describedby={`${id}-document-hint`}
                onChange={(event) => online.document?.onChange(event.target.value)}
                className={FIELD}
              />
              <span id={`${id}-document-hint`} className="text-shop-muted">
                {text.checkoutPayerDocumentHint}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {offlineMethods.length > 0 ? (
        <div role="group" aria-labelledby={both ? `${id}-later` : undefined} className="flex flex-col gap-2">
          {both ? (
            <p id={`${id}-later`} className="mt-2 text-xs font-semibold text-shop-muted">
              {text.checkoutPayLater}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {offlineMethods.map((method) => (
              <label key={method} className={OPTION}>
                <input
                  type="radio"
                  name={`${id}-payment`}
                  className={RADIO}
                  checked={!paysOnline && value.paymentMethod === method}
                  onChange={() => onChange({ ...value, paymentChannel: "OFFLINE", paymentMethod: method, installments: 1 })}
                />
                <span className="font-medium">{messages.orders.payments[method]}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </fieldset>
  )
}
