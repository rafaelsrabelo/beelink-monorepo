"use client"

// React
import { useEffect, useId, useRef, useState } from "react"
import type { FormEvent } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { customerDraftIssuesOf, type CustomerDraftIssues } from "@harness-monorepo/ui/lib/customer-draft"
import type { OrderCustomerDraft } from "@harness-monorepo/ui/lib/order-form"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { CustomerAddressInputs } from "./customer-address-inputs"
import type { CustomerRecordView } from "./customer-types"

export interface CustomerProfileFormProps {
  customer: Pick<CustomerRecordView, "name" | "email" | "phone" | "address">
  /** The draft, checked: the name trimmed, the phone as typed, every address part as typed. */
  onSubmit: (draft: OrderCustomerDraft) => void
  onCancel: () => void
  pending?: boolean
  /** The phone refused — another customer of the shop has it — already in words. */
  phoneError?: string
  /** Any other refusal, already in words. */
  error?: string
  messages?: UiMessages
}

function draftOf(customer: CustomerProfileFormProps["customer"]): OrderCustomerDraft {
  const { address } = customer
  return {
    name: customer.name,
    phone: customer.phone ?? "",
    address: {
      zipCode: address.zipCode ?? "",
      street: address.street ?? "",
      number: address.number ?? "",
      complement: address.complement ?? "",
      neighborhood: address.neighborhood ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
    },
  }
}

/**
 * Correcting the shop's record of a customer: the name, the phone and the address. The e-mail is
 * shown and never a field — it is the account's, not the shop's. A refusal keeps what was typed and
 * puts the focus on what to fix: the first field the check points at, or the phone the API refused.
 */
export function CustomerProfileForm({ customer, onSubmit, onCancel, pending = false, phoneError, error, messages = defaultMessages }: CustomerProfileFormProps) {
  const text = messages.customers.record
  const words = messages.orders.form
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const phone = useRef<HTMLInputElement>(null)
  const refused = useRef(false)
  const [draft, setDraft] = useState(() => draftOf(customer))
  const [issues, setIssues] = useState<CustomerDraftIssues>({})
  const phoneIssue = issues.phone ?? phoneError

  useEffect(() => {
    if (!refused.current) return
    refused.current = false
    form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus()
  })

  useEffect(() => {
    if (phoneError) phone.current?.focus()
  }, [phoneError])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    // A record that had a phone may not be emptied: the API refuses it, so the check says it first.
    const found = customerDraftIssuesOf(draft, words, { phoneRequired: customer.phone !== null })
    setIssues(found)
    if (Object.keys(found).length) refused.current = true
    else onSubmit({ ...draft, name: draft.name.trim() })
  }

  return (
    <form ref={form} noValidate onSubmit={submit} className="flex flex-col gap-4">
      <Field data-invalid={issues.name ? true : undefined}>
        <FieldLabel htmlFor={`${id}-name`}>{text.name}</FieldLabel>
        <Input
          id={`${id}-name`}
          autoComplete="off"
          maxLength={120}
          value={draft.name}
          aria-invalid={issues.name ? true : undefined}
          aria-describedby={issues.name ? `${id}-name-error` : undefined}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <FieldError id={`${id}-name-error`}>{issues.name}</FieldError>
      </Field>

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{text.email}</span>
        <span className="text-muted-foreground break-all">{customer.email ?? text.noEmail}</span>
        {customer.email ? <span className="text-muted-foreground text-xs">{text.emailFixed}</span> : null}
      </div>

      <Field data-invalid={phoneIssue ? true : undefined}>
        <FieldLabel htmlFor={`${id}-phone`}>{text.phone}</FieldLabel>
        <Input
          ref={phone}
          id={`${id}-phone`}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          maxLength={25}
          value={draft.phone}
          aria-invalid={phoneIssue ? true : undefined}
          aria-describedby={`${id}-phone-note`}
          onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
        />
        {phoneIssue ? <FieldError id={`${id}-phone-note`}>{phoneIssue}</FieldError> : <FieldDescription id={`${id}-phone-note`}>{words.customerPhoneHint}</FieldDescription>}
      </Field>

      <FieldSet className="gap-3">
        <FieldLegend variant="label">{text.address}</FieldLegend>
        <CustomerAddressInputs idPrefix={id} value={draft.address} onChange={(address) => setDraft({ ...draft, address })} issues={issues} messages={messages} />
      </FieldSet>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? text.saving : text.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {text.cancel}
        </Button>
      </div>
    </form>
  )
}
