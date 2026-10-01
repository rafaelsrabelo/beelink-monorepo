// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontAccountPrivacyProps {
  /** The account's e-mail: what an account with no password types to confirm, and the username a password manager reads. */
  email: string
  /** Confirming takes the password; an account opened through Google has none and types its e-mail. */
  hasPassword: boolean
  /** Where "Baixar meus dados" goes: a handler that answers with the file. */
  dataHref: string
  /** Where the deletion posts. */
  deleteAction: string
  /** Carried through the post: this page, to come back to with a refusal, and the shop's sign-in. */
  hidden?: Readonly<Record<string, string>>
  /** A refused deletion, already a sentence: the confirmation comes back open with it. */
  error?: string | null
  messages?: UiMessages
}

const SECONDARY = "inline-flex h-11 items-center rounded-xl border border-shop-line-strong px-5 text-sm font-semibold hover:bg-shop-fill"
const INPUT = "h-11 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background"

/**
 * Privacidade (6h, BEELINK-152): a copy of everything the shop keeps about the shopper, and the end
 * of their account. The deletion opens in a `details` and posts a plain form, like the rest of the
 * area: it works with no script, and asks again — the password, or the e-mail of an account that
 * has none — so a stray click ends nothing.
 *
 * The link has no `download`: the handler sends the file as an attachment, and a session that ended
 * is sent to the sign-in instead — which `download` would have saved as a file.
 */
export function StorefrontAccountPrivacy({ email, hasPassword, dataHref, deleteAction, hidden = {}, error, messages = defaultMessages }: StorefrontAccountPrivacyProps) {
  const text = messages.storefront
  const headingId = useId()
  const hintId = useId()
  const leadId = useId()
  const errorId = useId()
  const fieldId = useId()
  const described = [leadId, error ? errorId : null].filter(Boolean).join(" ")

  return (
    <section id="privacidade" aria-labelledby={headingId} className="flex w-full max-w-3xl scroll-mt-[calc(var(--shop-masthead-height,160px)+16px)] flex-col gap-5 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-base font-bold">
          {text.privacyTitle}
        </h2>
        <p className="text-sm text-shop-muted">{text.privacyLead}</p>
      </div>

      <div className="flex flex-col items-start gap-1">
        <a href={dataHref} aria-describedby={hintId} className={SECONDARY}>
          {text.privacyDownload}
        </a>
        <span id={hintId} className="text-xs text-shop-muted">
          {text.privacyDownloadHint}
        </span>
      </div>

      <details open={Boolean(error)} className="border-t border-shop-line pt-5">
        <summary className="w-fit cursor-pointer text-sm font-bold text-shop-sale-ink">{text.privacyDelete}</summary>
        <form action={deleteAction} method="post" className="mt-4 flex flex-col gap-4">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <p id={leadId} className="text-sm text-shop-muted">
            {text.privacyDeleteLead}
          </p>
          {error ? (
            <p id={errorId} role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-1">
            <label htmlFor={fieldId} className="text-sm font-medium">
              {hasPassword ? text.privacyDeletePassword : format(text.privacyDeleteEmail, { email })}
            </label>
            {hasPassword ? (
              <>
                {/* The account's login, for a password manager to offer the right password; nobody types it. */}
                <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
                <input id={fieldId} name="password" type="password" required maxLength={128} autoComplete="current-password" aria-describedby={described} aria-invalid={error ? true : undefined} className={INPUT} />
              </>
            ) : (
              <input id={fieldId} name="email" type="email" required maxLength={320} autoComplete="off" spellCheck={false} aria-describedby={described} aria-invalid={error ? true : undefined} className={INPUT} />
            )}
          </div>
          <button type="submit" className="h-11 self-start rounded-xl bg-shop-sale px-5 text-sm font-semibold text-shop-on-sale transition-opacity hover:opacity-90">
            {text.privacyDeleteSubmit}
          </button>
        </form>
      </details>
    </section>
  )
}
