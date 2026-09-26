"use client"

// React
import { useId, useState } from "react"
import type { KeyboardEvent } from "react"

// Libs
import { ChevronDownIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { customerDraftIssuesOf, type CustomerDraftIssues } from "@harness-monorepo/ui/lib/customer-draft"
import type { OrderCustomerDraft, OrderCustomerOption } from "@harness-monorepo/ui/lib/order-form"
import { CustomerAddressInputs } from "../customers/customer-address-inputs"

export interface OrderCustomerCreateProps {
  /** What the search box held, split by the screen into a name or a phone. */
  initial?: Partial<Pick<OrderCustomerDraft, "name" | "phone">>
  onSubmit: (draft: OrderCustomerDraft) => void
  onCancel: () => void
  pending?: boolean
  /** A refusal already put into words by the screen. */
  error?: string
  /** The customer who already has the phone typed: offered instead of a second one. */
  existing?: OrderCustomerOption | null
  onUseExisting?: (customer: OrderCustomerOption) => void
  messages?: UiMessages
}

/**
 * Registering a customer without leaving the order. It sits inside the order's form, where a second
 * `<form>` is not allowed, so Enter is caught here: it registers the customer, never the order.
 */
export function OrderCustomerCreate({
  initial,
  onSubmit,
  onCancel,
  pending = false,
  error,
  existing = null,
  onUseExisting,
  messages = defaultMessages,
}: OrderCustomerCreateProps) {
  const text = messages.orders.form
  const id = useId()
  const [draft, setDraft] = useState<OrderCustomerDraft>({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    address: { zipCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
  })
  const [addressOpen, setAddressOpen] = useState(false)
  const [issues, setIssues] = useState<CustomerDraftIssues>({})

  function submit() {
    const found = customerDraftIssuesOf(draft, text)
    setIssues(found)
    // A refusal inside a folded address would block the save with nothing on screen to say why.
    if (found.zipCode || found.state) setAddressOpen(true)
    if (Object.keys(found).length === 0) onSubmit(draft)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return
    event.preventDefault()
    if (!pending) submit()
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4" onKeyDown={onKeyDown}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={issues.name ? true : undefined}>
          <FieldLabel htmlFor={`${id}-name`}>{text.customerName}</FieldLabel>
          <Input
            id={`${id}-name`}
            autoComplete="off"
            maxLength={120}
            value={draft.name}
            aria-invalid={issues.name ? true : undefined}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <FieldError>{issues.name}</FieldError>
        </Field>
        <Field data-invalid={issues.phone ? true : undefined}>
          <FieldLabel htmlFor={`${id}-phone`}>{text.customerPhone}</FieldLabel>
          <Input
            id={`${id}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={25}
            value={draft.phone}
            aria-invalid={issues.phone ? true : undefined}
            onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
          />
          {issues.phone ? <FieldError>{issues.phone}</FieldError> : <FieldDescription>{text.customerPhoneHint}</FieldDescription>}
        </Field>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        aria-expanded={addressOpen}
        aria-controls={`${id}-address`}
        onClick={() => setAddressOpen(!addressOpen)}
      >
        <ChevronDownIcon className={addressOpen ? "rotate-180" : undefined} />
        {text.customerAddress}
      </Button>

      <CustomerAddressInputs
        id={`${id}-address`}
        hidden={!addressOpen}
        idPrefix={id}
        value={draft.address}
        onChange={(address) => setDraft({ ...draft, address })}
        issues={issues}
        messages={messages}
      />

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-destructive">{error}</span>
          {existing && onUseExisting ? (
            <Button type="button" variant="outline" size="sm" onClick={() => onUseExisting(existing)}>
              {format(text.customerUse, { name: existing.name })}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? text.customerSaving : text.customerSave}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {text.customerCancel}
        </Button>
      </div>
    </div>
  )
}
