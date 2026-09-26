"use client"

// React
import { useId, useRef } from "react"
import type { ReactNode } from "react"

// Libs
import { PencilIcon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { useFocusOnSwap } from "@harness-monorepo/ui/hooks/use-focus-on-swap"
import type { OrderCustomerDraft } from "@harness-monorepo/ui/lib/order-form"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { CustomerProfileForm } from "./customer-profile-form"
import type { CustomerRecordView } from "./customer-types"

export interface CustomerProfileProps {
  customer: Pick<CustomerRecordView, "name" | "email" | "emailVerified" | "phone" | "address">
  /** The address on one line, as the screen writes addresses; null when there is none. */
  addressLine: string | null
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (draft: OrderCustomerDraft) => void
  pending?: boolean
  /** The phone refused — another customer of the shop has it — already in words. */
  phoneError?: string
  /** Any other refusal, already in words. */
  error?: string
  /** The last correction went through. */
  saved?: boolean
  messages?: UiMessages
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  )
}

/**
 * Who the customer is to the shop: the name, the account's e-mail and whether it was confirmed, the
 * phone and the address — and, in the same card, the form that corrects them. Opening the form puts
 * the focus on the name; closing it puts it back on "Editar dados". A save is said once, politely,
 * in a status the card always holds, so it is heard when its words arrive.
 */
export function CustomerProfile({
  customer,
  addressLine,
  editing,
  onEdit,
  onCancel,
  onSave,
  pending = false,
  phoneError,
  error,
  saved = false,
  messages = defaultMessages,
}: CustomerProfileProps) {
  const text = messages.customers.record
  const titleId = useId()
  const content = useRef<HTMLDivElement>(null)
  useFocusOnSwap(editing ? "form" : "facts", content)

  return (
    <section aria-labelledby={titleId} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id={titleId} className="font-semibold">
          {text.details}
        </h2>
        <p role="status" className="text-muted-foreground text-sm">
          {saved && !editing ? text.saved : ""}
        </p>
      </div>

      <div ref={content} className="flex flex-col gap-4">
        {editing ? (
          <CustomerProfileForm customer={customer} onSubmit={onSave} onCancel={onCancel} pending={pending} phoneError={phoneError} error={error} messages={messages} />
        ) : (
          <>
            <dl className="grid gap-3">
              <Fact label={text.name}>{customer.name}</Fact>
              <Fact label={text.email}>
                {customer.email ? (
                  <>
                    <span className="break-all">{customer.email}</span>
                    <span className="text-muted-foreground"> · {customer.emailVerified ? text.emailVerified : text.emailUnverified}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{text.noEmail}</span>
                )}
              </Fact>
              <Fact label={text.phone}>
                <span className={customer.phone ? "tabular-nums" : "text-muted-foreground"}>{customer.phone ?? text.noPhone}</span>
              </Fact>
              <Fact label={text.address}>
                <span className={addressLine ? undefined : "text-muted-foreground"}>{addressLine ?? text.noAddress}</span>
              </Fact>
            </dl>
            <Button type="button" variant="outline" className="self-start" onClick={onEdit}>
              <PencilIcon aria-hidden="true" />
              {text.edit}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
