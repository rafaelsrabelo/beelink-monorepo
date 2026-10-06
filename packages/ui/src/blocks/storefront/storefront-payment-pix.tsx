"use client"

// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StorefrontCopyButton } from "./storefront-copy-button"

export interface StorefrontPaymentPixProps {
  /** What is charged, already written: "R$ 59,90". */
  amount: string
  /** The QR code, a PNG in base64, as the API hands it over. */
  image: string
  /** The copy-and-paste code. */
  payload: string
  /** Until when it is paid, already written: "7 de out., 23:59". */
  validUntil: string
  messages?: UiMessages
}

/**
 * A Pix to be paid, inside the shop: the amount, the QR code to scan from another screen, and the
 * code to copy into the bank's app on this one — which is how it is paid on a phone. It says until
 * when it is good, and that the confirmation shows here: nobody sends a receipt.
 */
export function StorefrontPaymentPix({ amount, image, payload, validUntil, messages = defaultMessages }: StorefrontPaymentPixProps) {
  const text = messages.storefront
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4 rounded-2xl border border-shop-line bg-shop-background p-5 shop-md:p-7">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-[17px] font-extrabold">
          {text.paymentPixTitle}
        </h2>
        <p className="text-sm text-shop-muted">{text.paymentPixSteps}</p>
      </div>
      <dl className="flex items-baseline gap-3">
        <dt className="text-sm text-shop-muted">{text.paymentAmount}</dt>
        <dd className="ml-auto text-2xl font-extrabold">{amount}</dd>
      </dl>
      {/* eslint-disable-next-line @next/next/no-img-element -- a data URL from the API: nothing for an optimizer to fetch */}
      <img src={`data:image/png;base64,${image}`} alt={text.paymentPixQrAlt} width={220} height={220} className="size-[220px] self-center rounded-[10px] border border-shop-line" />
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold tracking-[0.04em] text-shop-muted uppercase">{text.paymentPixCode}</p>
        <div className="flex flex-col gap-2 shop-md:flex-row shop-md:items-start">
          <code id={`${id}-code`} className="max-h-24 min-w-0 flex-1 overflow-y-auto rounded-[10px] border border-shop-line bg-shop-fill px-3 py-2 font-mono text-xs break-all">
            {payload}
          </code>
          <StorefrontCopyButton value={payload} label={text.paymentPixCopy} doneLabel={text.paymentPixCopied} selectedLabel={text.paymentPixSelected} targetId={`${id}-code`} />
        </div>
      </div>
      <p className="text-sm font-semibold">{format(text.paymentValidUntil, { date: validUntil })}</p>
      <p className="text-[13px] text-shop-muted">{text.paymentConfirmsHere}</p>
    </section>
  )
}
