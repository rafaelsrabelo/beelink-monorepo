"use client"

// React
import { useId } from "react"

// UI
import { isCpf, maskCpf } from "@harness-monorepo/ui/lib/cpf"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { maskField } from "../landing/landing-courier-masks"

export interface StorefrontCpfFieldProps {
  label: string
  /** Why the CPF is asked, under the field. */
  hint: string
  /** As typed, already masked: `529.982.247-25`. The screen reads its digits. */
  value: string
  onChange: (value: string) => void
  className?: string
  messages?: UiMessages
}

/**
 * The checkout's CPF — the payer's for an online payment, or whoever receives a carrier's parcel —
 * written `000.000.000-00` as it is typed or pasted, so a digit typed wrong is found by its group.
 * A digit corrected in the middle keeps the caret where it was (`maskField`). No `maxLength`: it
 * would cut a CPF pasted with words around it before the mask reads its digits.
 *
 * Eleven digits that are no CPF say so at once, under the field, rather than when the order is
 * sent and the API refuses it: the check digits are `isCpf`, the API's own rule restated.
 */
export function StorefrontCpfField({ label, hint, value, onChange, className, messages = defaultMessages }: StorefrontCpfFieldProps) {
  const id = useId()
  const digits = value.replace(/\D/g, "")
  const wrong = digits.length === 11 && !isCpf(digits)

  return (
    <div className={cn("flex flex-col gap-1 text-xs", className)}>
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        value={value}
        aria-invalid={wrong || undefined}
        aria-describedby={wrong ? `${id}-error ${id}-hint` : `${id}-hint`}
        onChange={(event) => {
          maskField(event.currentTarget, maskCpf)
          onChange(event.currentTarget.value)
        }}
        className={cn("h-10 rounded-[10px] border bg-shop-background px-3 text-sm tabular-nums", wrong ? "border-shop-sale-ink" : "border-shop-line")}
      />
      {wrong ? (
        <span id={`${id}-error`} role="alert" className="font-semibold text-shop-sale-ink">
          {messages.storefront.checkoutDocumentInvalid}
        </span>
      ) : null}
      <span id={`${id}-hint`} className="text-shop-muted">
        {hint}
      </span>
    </div>
  )
}
