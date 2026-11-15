"use client"

// React
import { useId, type FormEvent, type ReactNode } from "react"

// Libs
import { XIcon } from "lucide-react"

// UI
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateJoinFormValues, AffiliateJoinFormView, AffiliateJoinIssues } from "@harness-monorepo/ui/lib/affiliate-join"
import { maskPhone } from "@harness-monorepo/ui/lib/affiliate-wizard"
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

export interface StorefrontAffiliateJoinFormProps {
  view: AffiliateJoinFormView
  value: AffiliateJoinFormValues
  onChange: (value: AffiliateJoinFormValues) => void
  onSubmit: () => void
  onClose: () => void
  /** Opens the programme's terms over the page. */
  onTerms: () => void
  privacyHref: string
  issues?: AffiliateJoinIssues
  pending?: boolean
  /** The API's refusal, in words. */
  error?: string
  messages?: UiMessages
}

const INPUT = "border-shop-line-strong bg-shop-background text-shop-text h-12 rounded-xl text-base"

/**
 * The application (plan 2026-11-14): a name, an e-mail and a WhatsApp — the optional question when the
 * page asks it — and the terms and the privacy policy read. A field no person sees stays in the form:
 * a robot that fills it is answered as anyone, and nothing of it is kept.
 */
export function StorefrontAffiliateJoinForm({ view, value, onChange, onSubmit, onClose, onTerms, privacyHref, issues = {}, pending = false, error, messages = defaultMessages }: StorefrontAffiliateJoinFormProps) {
  const text = messages.affiliateJoin.form
  const id = useId()
  const set = (patch: Partial<AffiliateJoinFormValues>) => onChange({ ...value, ...patch })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  const field = (key: "name" | "email" | "phone", label: string, input: { type: string; autoComplete: string; inputMode?: "email" | "tel"; placeholder?: string }): ReactNode => (
    <Field data-invalid={issues[key] ? true : undefined}>
      <FieldLabel htmlFor={`${id}-${key}`} className="text-shop-text">
        {label}
      </FieldLabel>
      <Input
        id={`${id}-${key}`}
        {...input}
        value={value[key]}
        disabled={pending}
        aria-invalid={issues[key] ? true : undefined}
        className={INPUT}
        onChange={(event) => set({ [key]: key === "phone" ? maskPhone(event.target.value) : event.target.value })}
      />
      <FieldError>{issues[key]}</FieldError>
    </Field>
  )

  return (
    <form noValidate onSubmit={submit} aria-labelledby={`${id}-title`} className="bg-shop-background border-shop-line flex flex-col gap-4 rounded-2xl border p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="text-shop-text text-xl font-extrabold">
            {view.title}
          </h2>
          <p className="text-shop-muted text-sm">{view.subtitle}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={text.close} className="bg-shop-fill text-shop-text focus-visible:ring-shop-primary flex size-11 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-2">
          <XIcon aria-hidden="true" className="size-5" />
        </button>
      </div>

      {field("name", text.name, { type: "text", autoComplete: "name" })}
      {field("email", text.email, { type: "email", autoComplete: "email", inputMode: "email" })}
      {field("phone", text.phone, { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: text.phonePlaceholder })}
      {view.extraQuestion ? (
        <Field>
          <FieldLabel htmlFor={`${id}-extra`} className="text-shop-text">
            {view.extraQuestion} <span className="text-shop-muted font-normal">{text.optional}</span>
          </FieldLabel>
          <Input id={`${id}-extra`} value={value.extraAnswer} disabled={pending} className={INPUT} onChange={(event) => set({ extraAnswer: event.target.value })} />
        </Field>
      ) : null}

      {/* No person sees it, no keyboard reaches it: a robot fills what it finds. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" value={value.website} onChange={(event) => set({ website: event.target.value })} />

      <Field orientation="horizontal" data-invalid={issues.accepted ? true : undefined}>
        <Checkbox id={`${id}-accepted`} checked={value.accepted} disabled={pending} aria-invalid={issues.accepted ? true : undefined} onCheckedChange={(accepted: boolean) => set({ accepted })} />
        <FieldLabel htmlFor={`${id}-accepted`} className="text-shop-text font-normal">
          {withParts(text.accept, {
            terms: (
              <button type="button" onClick={onTerms} className="text-shop-primary-ink underline underline-offset-2">
                {text.terms}
              </button>
            ),
            privacy: (
              <a href={privacyHref} target="_blank" rel="noreferrer" className="text-shop-primary-ink underline underline-offset-2">
                {text.privacy}
              </a>
            ),
          })}
        </FieldLabel>
      </Field>
      {issues.accepted ? <FieldError className="-mt-2">{issues.accepted}</FieldError> : null}

      {error ? (
        <p role="alert" className="bg-shop-fill text-shop-text rounded-xl px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="bg-shop-primary text-shop-on-primary focus-visible:ring-shop-primary min-h-12 rounded-xl text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60">
        {pending ? text.sending : text.submit}
      </button>
      <FieldDescription className="text-shop-muted">{view.note}</FieldDescription>
    </form>
  )
}
