"use client"

// React
import type { FormEvent } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import type { ContactFieldType } from "../design/design-types"
import { StorefrontHeading } from "./storefront-heading"

/** One question, as the form draws it. The contract's `ContactField`, restated. */
export interface StorefrontContactField {
  id: string
  label: string
  type: ContactFieldType
  required: boolean
  options?: readonly string[] | null
}

/** What a filled-in form hands the screen: the name, the answers by field id, and the trap. */
export interface StorefrontContactSubmission {
  name: string
  answers: Record<string, string>
  website: string
}

export interface StorefrontContactProps {
  title?: string | null
  subtitle?: string | null
  fields: readonly StorefrontContactField[]
  /** The site's WhatsApp, when it has one: the other way in, beside the form. */
  whatsappHref?: string | null
  /** Where the send is. `sent` replaces the form with the thank-you, so it cannot go twice. */
  status?: "idle" | "sending" | "sent"
  /** A sentence from the screen, already in the reader's language. */
  error?: string | null
  /** Absent in design mode's preview: the form draws, and sends nothing. */
  onSubmit?: (submission: StorefrontContactSubmission) => void
  messages?: UiMessages
}

const INPUT =
  "w-full rounded-xl border border-current/20 bg-transparent px-3 text-base outline-none focus-visible:border-current/60 focus-visible:ring-2 focus-visible:ring-current/20"

const KIND: Record<Exclude<ContactFieldType, "TEXTAREA" | "SELECT">, { type: string; autoComplete?: string; inputMode?: "tel" | "email" }> = {
  TEXT: { type: "text" },
  EMAIL: { type: "email", autoComplete: "email", inputMode: "email" },
  PHONE: { type: "tel", autoComplete: "tel", inputMode: "tel" },
  DATE: { type: "date" },
}

function Control({ field, disabled, placeholder }: { field: StorefrontContactField; disabled: boolean; placeholder: string }) {
  const common = { id: `contact-${field.id}`, name: `answer:${field.id}`, required: field.required, disabled }

  if (field.type === "TEXTAREA") return <textarea {...common} rows={4} maxLength={2000} className={cn(INPUT, "py-2")} />

  // Native, not the design system's Select: this is the anonymous shop window, which must work on
  // any phone before a script arrives, and a native list is also the one a phone draws best.
  if (field.type === "SELECT") {
    return (
      <select {...common} defaultValue="" className={cn(INPUT, "h-12")}>
        <option value="" disabled>
          {placeholder}
        </option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  const kind = KIND[field.type]

  return <input {...common} {...kind} maxLength={field.type === "TEXT" ? 200 : undefined} className={cn(INPUT, "h-12")} />
}

/**
 * A site's contact form, beside the other way in.
 *
 * Drawn from the questions its owner declared, in their order, with the visitor's name always
 * first. The browser checks what it can — required, the shape of an e-mail — and the API checks
 * the rest; what the API refuses comes back as `error`, said under the button.
 *
 * The trap is a field no person sees: out of view, out of the tab order, hidden from assistive
 * technology, and named like something a robot fills in. A submission that carries it is answered
 * as a success by the API and kept nowhere.
 */
export function StorefrontContact({
  title,
  subtitle,
  fields,
  whatsappHref = null,
  status = "idle",
  error = null,
  onSubmit,
  messages = defaultMessages,
}: StorefrontContactProps) {
  const text = messages.storefront.contact
  const sending = status === "sending"

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onSubmit || sending) return

    const data = new FormData(event.currentTarget)
    const answers: Record<string, string> = {}
    for (const field of fields) {
      const value = String(data.get(`answer:${field.id}`) ?? "").trim()
      if (value) answers[field.id] = value
    }

    onSubmit({ name: String(data.get("name") ?? "").trim(), answers, website: String(data.get("website") ?? "") })
  }

  return (
    <div className="grid gap-8 py-6 md:grid-cols-2 md:gap-12">
      <div className="flex flex-col gap-4">
        <StorefrontHeading title={title} subtitle={subtitle} align="LEFT" />
        {whatsappHref ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm opacity-75">{text.whatsappLead}</p>
            <a
              href={whatsappHref}
              rel="noreferrer"
              target="_blank"
              className="inline-flex h-11 items-center rounded-xl border border-current/25 px-4 text-sm font-medium"
            >
              {text.whatsappAction}
            </a>
          </div>
        ) : null}
      </div>

      {status === "sent" ? (
        <div role="status" className="flex flex-col gap-2 rounded-2xl border border-current/15 p-6">
          <p className="text-lg font-semibold">{text.sentTitle}</p>
          <p className="opacity-80">{text.sentText}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-current/15 p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-name" className="text-sm font-medium">
              {text.nameLabel}
            </label>
            <input id="contact-name" name="name" required minLength={2} maxLength={120} autoComplete="name" disabled={sending} className={cn(INPUT, "h-12")} />
          </div>

          {fields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label htmlFor={`contact-${field.id}`} className="text-sm font-medium">
                {field.label}
                {field.required ? null : <span className="font-normal opacity-60"> ({text.optional})</span>}
              </label>
              <Control field={field} disabled={sending} placeholder={text.selectPlaceholder} />
            </div>
          ))}

          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="contact-website">{text.trapLabel}</label>
            <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <button
            type="submit"
            disabled={sending || !onSubmit}
            className="h-12 rounded-xl text-base font-semibold disabled:opacity-60"
            style={{ backgroundColor: "var(--shop-primary)", color: "var(--shop-on-primary)" }}
          >
            {sending ? text.sending : text.submit}
          </button>
          {error ? (
            <p role="alert" className="text-sm font-medium">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </div>
  )
}
