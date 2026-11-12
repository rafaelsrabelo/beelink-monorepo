"use client"

// React
import { useId } from "react"

// UI
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePersonIssues, AffiliatePersonValues } from "@harness-monorepo/ui/lib/affiliate-wizard"
import { maskPhone } from "@harness-monorepo/ui/lib/affiliate-wizard"
import { maskCpf } from "@harness-monorepo/ui/lib/cpf"

export interface AffiliatePersonFieldsProps {
  value: AffiliatePersonValues
  onChange: (value: AffiliatePersonValues) => void
  issues?: AffiliatePersonIssues
  disabled?: boolean
  messages?: UiMessages
}

/** The label of a required field: the asterisk is drawn, and read as a word. */
function Required({ htmlFor, children, word }: { htmlFor: string; children: string; word: string }) {
  return (
    <FieldLabel htmlFor={htmlFor}>
      {children}
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
      <span className="sr-only">({word})</span>
    </FieldLabel>
  )
}

/**
 * Step one of the invite (the user's design, 12/11/2026): who, and how to reach them. Every field is
 * required — the phone and the CPF since #314 — and each says what is wrong right under it.
 */
export function AffiliatePersonFields({ value, onChange, issues = {}, disabled = false, messages = defaultMessages }: AffiliatePersonFieldsProps) {
  const text = messages.affiliates.wizard
  const id = useId()
  const describedBy = (field: keyof AffiliatePersonValues) => `${id}-${field}-${issues[field] ? "error" : "help"}`
  // Only the e-mail has a line under it when nothing is wrong: the others point at nothing then.
  const errorOf = (field: keyof AffiliatePersonValues) => (issues[field] ? describedBy(field) : undefined)

  return (
    <div className="flex flex-col gap-5">
      <Field data-invalid={issues.name ? true : undefined}>
        <Required htmlFor={`${id}-name`} word={text.required}>
          {text.person.name}
        </Required>
        <Input id={`${id}-name`} autoComplete="off" value={value.name} disabled={disabled} aria-invalid={issues.name ? true : undefined} aria-describedby={errorOf("name")} onChange={(event) => onChange({ ...value, name: event.target.value })} />
        {issues.name ? <FieldError id={describedBy("name")}>{issues.name}</FieldError> : null}
      </Field>

      <Field data-invalid={issues.email ? true : undefined}>
        <Required htmlFor={`${id}-email`} word={text.required}>
          {text.person.email}
        </Required>
        <Input
          id={`${id}-email`}
          type="email"
          autoComplete="off"
          value={value.email}
          disabled={disabled}
          aria-invalid={issues.email ? true : undefined}
          aria-describedby={describedBy("email")}
          onChange={(event) => onChange({ ...value, email: event.target.value })}
        />
        {issues.email ? <FieldError id={describedBy("email")}>{issues.email}</FieldError> : <FieldDescription id={describedBy("email")}>{text.person.emailHelp}</FieldDescription>}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field data-invalid={issues.phone ? true : undefined}>
          <Required htmlFor={`${id}-phone`} word={text.required}>
            {text.person.phone}
          </Required>
          <Input
            id={`${id}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="(11) 99999-8888"
            value={value.phone}
            disabled={disabled}
            aria-invalid={issues.phone ? true : undefined}
            aria-describedby={errorOf("phone")}
            onChange={(event) => onChange({ ...value, phone: maskPhone(event.target.value) })}
          />
          {issues.phone ? <FieldError id={describedBy("phone")}>{issues.phone}</FieldError> : null}
        </Field>

        <Field data-invalid={issues.cpf ? true : undefined}>
          <Required htmlFor={`${id}-cpf`} word={text.required}>
            {text.person.cpf}
          </Required>
          <Input
            id={`${id}-cpf`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={value.cpf}
            disabled={disabled}
            aria-invalid={issues.cpf ? true : undefined}
            aria-describedby={errorOf("cpf")}
            onChange={(event) => onChange({ ...value, cpf: maskCpf(event.target.value) })}
          />
          {issues.cpf ? <FieldError id={describedBy("cpf")}>{issues.cpf}</FieldError> : null}
        </Field>
      </div>
    </div>
  )
}
