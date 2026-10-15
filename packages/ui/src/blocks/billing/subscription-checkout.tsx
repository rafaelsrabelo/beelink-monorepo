"use client"

// React
import { useEffect, useRef, useState } from "react"

// Libs
import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { planMoney } from "@harness-monorepo/ui/lib/plan-figures"
import type { SubscriptionAccountView, SubscriptionCheckoutValues, SubscriptionCycleValue, SubscriptionOfferView } from "@harness-monorepo/ui/lib/subscription"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { SubscriptionAccountFields } from "./subscription-account-fields"
import { SubscriptionCycles } from "./subscription-cycles"
import { isBillingName, isCpfOrCnpj } from "./subscription-document"
import { SubscriptionFacts, type SubscriptionLoss } from "./subscription-facts"

export interface SubscriptionCheckoutProps {
  /** The cycles on sale, their figures worked out. Never empty where the form is drawn: the screen says the plan is unavailable instead. */
  offers: readonly SubscriptionOfferView[]
  /** The invoice already open for the page, with its cycle and what it charges: that cycle is chosen when the form opens, and the button resumes it while it stays chosen. */
  openInvoice?: { cycle: SubscriptionCycleValue; totalCents: number } | null
  account: SubscriptionAccountView | null
  /** The API asked who is charged though the screen held an account: the fields are drawn whatever `account` says. */
  accountRequired?: boolean
  loss: SubscriptionLoss | null
  locale: string
  /**
   * The form with nothing left to fix. `asked` says whether the name and the document were asked —
   * the screen keeps them before it chooses the cycle — and they arrive empty when they were not.
   */
  onSubmit: (values: SubscriptionCheckoutValues, asked: boolean) => void
  pending?: boolean
  /** Why the last try did not go through, in a sentence the screen made. This block never sees an `errorCode`. */
  error?: string
  /** The API's refusal of a field the browser let through, in words. */
  fieldErrors?: Partial<Record<"name" | "document", string>>
  /** Why nothing can be bought here, in words: said in place of the button. */
  blocked?: string
  messages?: UiMessages
}

const NO_FIELD_ERRORS: Partial<Record<"name" | "document", string>> = {}

/**
 * How a page's plan is bought (BEELINK-293): the cycle, who is charged — asked only of an account
 * that never said, or that is changing it — what to know before paying, and the button that opens
 * Asaas's invoice. The screen owns the request: this block reaches no network.
 *
 * With an invoice already open, its cycle comes chosen and the button carries on with it; choosing
 * another says first that the open invoice stops being payable.
 */
export function SubscriptionCheckout({ offers, openInvoice = null, account, accountRequired = false, loss, locale, onSubmit, pending = false, error, fieldErrors = NO_FIELD_ERRORS, blocked, messages = defaultMessages }: SubscriptionCheckoutProps) {
  const text = messages.subscription
  const [changing, setChanging] = useState(false)
  const asking = account === null || accountRequired || changing
  // What the fields' rules read when they run: a rule kept from while the fields were drawn must not refuse once they are gone.
  const askingNow = useRef(asking)
  useEffect(() => {
    askingNow.current = asking
  }, [asking])

  const form = useForm<SubscriptionCheckoutValues>({ mode: "onTouched", defaultValues: { cycle: openInvoice?.cycle ?? offers[0]?.cycle ?? "MONTHLY", name: "", document: "" } })
  const cycle = useWatch({ control: form.control, name: "cycle" })
  const errors = form.formState.errors
  const nameField = form.register("name", { validate: (typed) => !askingNow.current || isBillingName(typed) || text.account.nameInvalid })
  const documentField = form.register("document", { validate: (typed) => !askingNow.current || isCpfOrCnpj(typed) || text.account.documentInvalid })

  // The API refused a field the browser had let through: the person is taken to it.
  useEffect(() => {
    if (fieldErrors.name) form.setFocus("name")
    else if (fieldErrors.document) form.setFocus("document")
  }, [fieldErrors.name, fieldErrors.document, form])

  const chosen = offers.find((offer) => offer.cycle === cycle) ?? offers[0]
  const blockedNotice =
    blocked !== undefined ? (
      <p role="status" className="bg-muted rounded-lg px-3 py-3 text-sm">
        {blocked}
      </p>
    ) : null
  // No cycle to offer: what is said of it is all there is.
  if (!chosen) return blockedNotice ? <div className="bg-shell-surface border-shell-border rounded-xl border p-4 shadow-xs sm:p-6">{blockedNotice}</div> : null

  const resuming = openInvoice !== null && openInvoice.cycle === chosen.cycle
  const switching = openInvoice !== null && !resuming
  const amount = planMoney(chosen.totalCents, locale)
  const label = pending ? text.submitting : resuming ? text.resume : format(switching ? text.switchSubmit : text.submit, { amount })

  return (
    <form
      noValidate
      aria-busy={pending || undefined}
      onSubmit={form.handleSubmit((values) => onSubmit(asking ? values : { cycle: values.cycle, name: "", document: "" }, asking))}
      className="bg-shell-surface border-shell-border flex flex-col gap-6 rounded-xl border p-4 shadow-xs sm:p-6"
    >
      {openInvoice ? (
        <p className="bg-muted rounded-lg px-3 py-3 text-sm">{format(text.openInvoice, { cycle: text.cycles.names[openInvoice.cycle], amount: planMoney(openInvoice.totalCents, locale) })}</p>
      ) : null}

      <Controller
        control={form.control}
        name="cycle"
        render={({ field }) => <SubscriptionCycles offers={offers} value={field.value} onChange={field.onChange} disabled={pending || blocked !== undefined} locale={locale} messages={messages} />}
      />

      {/* Where nothing can be bought, who would be charged and what paying means are not asked or said. */}
      {blockedNotice ?? (
        <>
          <SubscriptionAccountFields
            account={account}
            asking={asking}
            onChange={() => setChanging(true)}
            onKeep={() => {
              setChanging(false)
              form.clearErrors(["name", "document"])
            }}
            name={nameField}
            document={documentField}
            nameError={errors.name?.message ?? fieldErrors.name}
            documentError={errors.document?.message ?? fieldErrors.document}
            disabled={pending}
            messages={messages}
          />
          <SubscriptionFacts chargedCents={chosen.totalCents} loss={loss} locale={locale} messages={messages} />
        </>
      )}

      {switching ? (
        <p className="flex items-start gap-2 text-sm">
          <TriangleAlertIcon aria-hidden="true" className="text-destructive mt-0.5 size-4 shrink-0" />
          {text.switchWarning}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      {blockedNotice ? null : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button type="submit" size="lg" disabled={pending} className="h-10 px-4 text-base">
            {label}
            {pending ? null : <ArrowRightIcon aria-hidden="true" />}
          </Button>
          <p className="text-muted-foreground text-sm">{text.afterSubmit}</p>
        </div>
      )}
    </form>
  )
}
