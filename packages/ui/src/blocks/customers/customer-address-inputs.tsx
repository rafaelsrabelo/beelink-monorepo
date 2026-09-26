// UI
import { Field, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { CUSTOMER_ADDRESS_FIELDS, type CustomerAddressField, type CustomerDraftIssues } from "@harness-monorepo/ui/lib/customer-draft"
import type { OrderCustomerDraft } from "@harness-monorepo/ui/lib/order-form"

// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface CustomerAddressInputsProps {
  /** Prefixes every input's id, so two of these on one page never share one. */
  idPrefix: string
  value: OrderCustomerDraft["address"]
  onChange: (address: OrderCustomerDraft["address"]) => void
  issues?: Pick<CustomerDraftIssues, "zipCode" | "state">
  /** The wrapper's id, for a toggle that folds it to point at with `aria-controls`. */
  id?: string
  hidden?: boolean
  messages: UiMessages
}

/** Three rows of eight where there is room: CEP and street, number with complement and neighbourhood, city and UF. */
const SPAN: Record<CustomerAddressField, string> = {
  zipCode: "@md:col-span-3",
  street: "@md:col-span-5",
  number: "@md:col-span-2",
  complement: "@md:col-span-3",
  neighborhood: "@md:col-span-3",
  city: "@md:col-span-6",
  state: "@md:col-span-2",
}

/** The API's own limits per part: a longer one would only come back refused. */
const MAX_LENGTH: Record<CustomerAddressField, number> = {
  zipCode: 9,
  street: 160,
  number: 20,
  complement: 80,
  neighborhood: 80,
  city: 80,
  state: 2,
}

/**
 * A customer's address as the panel types it, wherever a customer is typed: registered on a new
 * order, or corrected on their record. The rows follow the room the fields have, not the window's —
 * the record draws them in its narrow side column, the new order across the whole form.
 */
export function CustomerAddressInputs({ idPrefix, value, onChange, issues = {}, id, hidden, messages }: CustomerAddressInputsProps) {
  const text = messages.orders.form

  return (
    <div id={id} hidden={hidden} className="@container">
      <div className="grid gap-4 @md:grid-cols-8">
        {CUSTOMER_ADDRESS_FIELDS.map((field) => {
          const issue = field === "zipCode" || field === "state" ? issues[field] : undefined
          const inputId = `${idPrefix}-${field}`

          return (
            <Field key={field} data-invalid={issue ? true : undefined} className={SPAN[field]}>
              <FieldLabel htmlFor={inputId}>{text[field]}</FieldLabel>
              <Input
                id={inputId}
                autoComplete="off"
                maxLength={MAX_LENGTH[field]}
                inputMode={field === "zipCode" ? "numeric" : undefined}
                value={value[field]}
                aria-invalid={issue ? true : undefined}
                aria-describedby={issue ? `${inputId}-error` : undefined}
                onChange={(event) => onChange({ ...value, [field]: event.target.value })}
              />
              <FieldError id={`${inputId}-error`}>{issue}</FieldError>
            </Field>
          )
        })}
      </div>
    </div>
  )
}
