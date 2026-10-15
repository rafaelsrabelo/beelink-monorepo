"use client"

// React
import { useId } from "react"

// Libs
import type { UseFormRegisterReturn } from "react-hook-form"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import type { SubscriptionAccountView } from "@harness-monorepo/ui/lib/subscription"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { maskField } from "../landing/landing-courier-masks"
import { BILLING_NAME_MAX_LENGTH, maskDocument } from "./subscription-document"

export interface SubscriptionAccountFieldsProps {
  /** Who the account's pages are charged to, as saved; null while it never said. */
  account: SubscriptionAccountView | null
  /** The two fields are drawn: an account that never said, or one being changed. */
  asking: boolean
  /** "Alterar dados de cobrança", on an account that said. */
  onChange: () => void
  /** "Manter os dados atuais", while changing them. */
  onKeep: () => void
  name: UseFormRegisterReturn<"name">
  document: UseFormRegisterReturn<"document">
  /** What is wrong with each, in a sentence: the browser's check, or the API's. */
  nameError?: string
  documentError?: string
  disabled?: boolean
  messages?: UiMessages
}

/**
 * Who a page's plan is charged to (BEELINK-291): the account's, once for all its pages, as Asaas asks
 * it of whoever pays at its invoice — a name and a CPF or CNPJ. The e-mail is the account's own, and
 * nothing else is asked.
 *
 * Once saved it is said, with the document masked as the API answers it, and can be changed: the
 * document is typed again, since it is never read back whole. The document's field writes the
 * digits as a CPF until they are longer than one, then as a CNPJ.
 */
export function SubscriptionAccountFields({ account, asking, onChange, onKeep, name, document, nameError, documentError, disabled = false, messages = defaultMessages }: SubscriptionAccountFieldsProps) {
  const text = messages.subscription.account
  const id = useId()

  return (
    <FieldSet className="min-w-0">
      <FieldLegend>{text.title}</FieldLegend>
      {asking ? (
        <>
          <FieldDescription>{text.lead}</FieldDescription>
          <div className="grid gap-4 md:grid-cols-2">
            <Field data-invalid={nameError ? true : undefined}>
              <FieldLabel htmlFor={`${id}-name`}>{text.name}</FieldLabel>
              <Input
                id={`${id}-name`}
                autoComplete="name"
                maxLength={BILLING_NAME_MAX_LENGTH}
                placeholder={text.namePlaceholder}
                disabled={disabled}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? `${id}-name-error` : undefined}
                {...name}
              />
              {nameError ? <FieldError id={`${id}-name-error`}>{nameError}</FieldError> : null}
            </Field>
            <Field data-invalid={documentError ? true : undefined}>
              <FieldLabel htmlFor={`${id}-document`}>{text.document}</FieldLabel>
              <Input
                id={`${id}-document`}
                inputMode="numeric"
                autoComplete="off"
                placeholder={text.documentPlaceholder}
                disabled={disabled}
                aria-invalid={documentError ? true : undefined}
                aria-describedby={documentError ? `${id}-document-error` : undefined}
                {...document}
                onChange={(event) => {
                  maskField(event.currentTarget, maskDocument)
                  return document.onChange(event)
                }}
              />
              {documentError ? <FieldError id={`${id}-document-error`}>{documentError}</FieldError> : null}
            </Field>
          </div>
          {account ? (
            <Button type="button" variant="link" className="w-fit px-0" disabled={disabled} onClick={onKeep}>
              {text.keep}
            </Button>
          ) : null}
        </>
      ) : account ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm break-words">{format(text.chargedTo, { name: account.name, documentType: account.documentType, document: account.document })}</p>
          <Button type="button" variant="link" className="h-auto px-0" disabled={disabled} onClick={onChange}>
            {text.change}
          </Button>
        </div>
      ) : null}
    </FieldSet>
  )
}
