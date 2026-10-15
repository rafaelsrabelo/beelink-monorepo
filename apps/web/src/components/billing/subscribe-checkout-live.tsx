"use client"

// React
import { useState } from "react"

// Types
import type { SubscriptionLoss } from "@harness-monorepo/ui/blocks/billing/subscription-facts"
import type { SubscriptionAccountView, SubscriptionCheckoutValues, SubscriptionOfferView } from "@harness-monorepo/ui/lib/subscription"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { SubscriptionCheckout } from "@harness-monorepo/ui/blocks/billing/subscription-checkout"

// App
import { errorSentenceOf } from "@/lib/error-sentence"
import type { OpenInvoice } from "@/lib/subscribe-view"
import type { WebMessages } from "@/locales"
import { useChooseCycle, useSaveBillingAccount } from "@/services/billing/billing-hooks"
import { BillingRequestError } from "@/services/billing/billing-requests"

/** An invoice the screen sent the shopkeeper to, and whether it charges other than the button said. */
export interface OpenedInvoice {
  invoiceUrl: string
  priceChanged: boolean
}

export interface SubscribeCheckoutLiveProps {
  slug: string
  locale: string
  offers: SubscriptionOfferView[]
  openInvoice: OpenInvoice | null
  account: SubscriptionAccountView | null
  loss: SubscriptionLoss | null
  /** Why nothing can be bought here, in words. */
  blocked?: string
  /** The invoice is out: the screen waits on it from here. */
  onOpened: (opened: OpenedInvoice) => void
  messages: UiMessages
  errors: WebMessages["errors"]
}

const codeOf = (error: unknown): string => (error instanceof BillingRequestError ? error.errorCode : "UNKNOWN")

/** The two refusals of who is charged that belong to a field, said on it rather than over the button. */
const FIELD_OF: Record<string, "name" | "document"> = { BILLING_NAME_INVALID: "name", BILLING_DOCUMENT_INVALID: "document" }

/**
 * The checkout of the Assinar screen (BEELINK-293), wired: who is charged is kept first when it was
 * asked (`PUT /api/billing/account`), then the cycle is chosen (`PUT …/subscription`), and Asaas's
 * invoice is opened in another tab — unless what it charges is not what the button said, which the
 * screen says before anything is paid. A browser may hold back a tab opened after a request: the
 * screen's wait carries the same invoice's link.
 *
 * `409 BILLING_ACCOUNT_REQUIRED` — the account never said, whatever the screen read — draws the two
 * fields; any other refusal is a sentence from the dictionary.
 */
export function SubscribeCheckoutLive({ slug, locale, offers, openInvoice, account, loss, blocked, onOpened, messages, errors }: SubscribeCheckoutLiveProps) {
  const save = useSaveBillingAccount()
  const choose = useChooseCycle(slug)
  const [accountRequired, setAccountRequired] = useState(false)

  async function subscribe(values: SubscriptionCheckoutValues, asked: boolean) {
    save.reset()
    choose.reset()
    if (asked) {
      const kept = await save.mutateAsync({ name: values.name, document: values.document }).then(
        () => true,
        () => false,
      )
      if (!kept) return
      setAccountRequired(false)
    }

    const choice = await choose.mutateAsync({ cycle: values.cycle }).catch((error: unknown) => {
      if (codeOf(error) === "BILLING_ACCOUNT_REQUIRED") setAccountRequired(true)
      return null
    })
    if (!choice) return

    const shown = offers.find((offer) => offer.cycle === values.cycle)?.totalCents
    const priceChanged = choice.subscription.priceCents !== shown
    if (!priceChanged) window.open(choice.invoiceUrl, "_blank", "noopener,noreferrer")
    onOpened({ invoiceUrl: choice.invoiceUrl, priceChanged })
  }

  const saveCode = save.error ? codeOf(save.error) : null
  // Own keys only: a code that names a member of `Object` reads as any unknown one.
  const field = saveCode && Object.hasOwn(FIELD_OF, saveCode) ? FIELD_OF[saveCode] : undefined
  const failed = choose.error ? codeOf(choose.error) : saveCode && !field ? saveCode : null

  return (
    <SubscriptionCheckout
      offers={offers}
      openInvoice={openInvoice ? { cycle: openInvoice.cycle, totalCents: openInvoice.priceCents } : null}
      account={account}
      accountRequired={accountRequired}
      loss={loss}
      locale={locale}
      onSubmit={(values, asked) => void subscribe(values, asked)}
      pending={save.isPending || choose.isPending}
      error={failed ? errorSentenceOf(errors, failed) : undefined}
      fieldErrors={field && saveCode ? { [field]: errorSentenceOf(errors, saveCode) } : undefined}
      blocked={blocked}
      messages={messages}
    />
  )
}
