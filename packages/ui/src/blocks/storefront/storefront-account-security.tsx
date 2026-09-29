// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** The fields of the password change, as they post. */
export type StorefrontSecurityField = "atual" | "password" | "confirmacao"

export interface StorefrontAccountSecurityProps {
  /** The account's e-mail: the username a password manager files the password under, and where a link goes. */
  email: string
  /** An account opened through Google has none: it creates one by an e-mailed link instead of changing it. */
  hasPassword: boolean
  /** Where each form posts: the web's route handlers. */
  actions: { change: string; create: string; everywhere: string }
  /** Carried through each post: this page, to come back to. */
  hidden?: Readonly<Record<string, string>>
  /** What the last change came back with, already a sentence. */
  notice?: string | null
  /** A refusal, already a sentence. */
  error?: string | null
  /** The field the refusal is about, marked and described by it. */
  invalidField?: StorefrontSecurityField | null
  messages?: UiMessages
}

const INPUT = "h-11 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background"
const PRIMARY = "h-12 rounded-xl bg-shop-primary px-6 text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90"
const SECONDARY = "h-11 rounded-xl border border-shop-line-strong px-5 text-sm font-semibold hover:bg-shop-fill"

/**
 * The shopper's own access to their account (BEELINK-150): the password changed — or, for an account
 * opened through Google, created by an e-mailed link — and every device signed out. Plain forms that
 * post and come back, like the rest of the area; no password is ever held by page code.
 */
export function StorefrontAccountSecurity({
  email,
  hasPassword,
  actions,
  hidden = {},
  notice,
  error,
  invalidField = null,
  messages = defaultMessages,
}: StorefrontAccountSecurityProps) {
  const text = messages.storefront
  const headingId = useId()
  const errorId = useId()
  const carried = Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)

  const password = (name: StorefrontSecurityField, label: string, autoComplete: string, hint?: string) => {
    const id = `${headingId}-${name}`
    const invalid = Boolean(error) && name === invalidField
    const described = [hint ? `${id}-hint` : null, invalid ? errorId : null].filter(Boolean).join(" ")
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <input
          id={id}
          name={name}
          type="password"
          required
          minLength={name === "atual" ? 1 : 8}
          maxLength={128}
          autoComplete={autoComplete}
          aria-describedby={described || undefined}
          aria-invalid={invalid || undefined}
          className={INPUT}
        />
        {hint ? (
          <span id={`${id}-hint`} className="text-xs text-shop-muted">
            {hint}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <section id="seguranca" aria-labelledby={headingId} className="flex w-full scroll-mt-40 max-w-3xl flex-col gap-5 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background">
      <h2 id={headingId} className="text-base font-bold">
        {text.securityTitle}
      </h2>

      {error ? (
        <p id={errorId} role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}

      {hasPassword ? (
        <form action={actions.change} method="post" className="flex flex-col gap-4">
          {carried}
          <p className="text-sm text-shop-muted">{text.securityChangeLead}</p>
          {/* The account's login, for a password manager to file the new password under; nobody types it. */}
          <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
          {password("atual", text.securityCurrentPassword, "current-password")}
          <div className="grid gap-4 shop-md:grid-cols-2">
            {password("password", text.newPasswordLabel, "new-password", text.signInPasswordHint)}
            {password("confirmacao", text.newPasswordRepeat, "new-password")}
          </div>
          <button type="submit" className={`${PRIMARY} self-start`}>
            {text.securityChangeSubmit}
          </button>
        </form>
      ) : (
        <form action={actions.create} method="post" className="flex flex-col gap-4">
          {carried}
          <p className="text-sm text-shop-muted">{format(text.securityGoogleLead, { email })}</p>
          <button type="submit" className={`${PRIMARY} self-start`}>
            {text.securityCreateSubmit}
          </button>
        </form>
      )}

      <form action={actions.everywhere} method="post" className="flex flex-col gap-3 border-t border-shop-line pt-5">
        {carried}
        <p className="text-sm text-shop-muted">{text.securityEverywhereLead}</p>
        <button type="submit" className={`${SECONDARY} self-start`}>
          {text.securityEverywhereSubmit}
        </button>
      </form>
    </section>
  )
}
