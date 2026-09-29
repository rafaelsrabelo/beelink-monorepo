// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontNewPasswordProps {
  /** Where the new password posts: the web's route handler, which hands it to the API with the link's token. */
  action: string
  /** Carried through the post: the link's token, where to go back to, and this page for a refusal. */
  hidden: Readonly<Record<string, string>>
  /** A refusal, already a sentence. */
  error?: string | null
  messages?: UiMessages
}

const INPUT = "h-11 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background"

/**
 * The new password of a shopper's account, at the shop, from the link its e-mail carried: typed twice,
 * so a slip is caught before the old one is gone. A plain form, like the sign-in: no script, and no
 * password ever held by page code.
 */
export function StorefrontNewPassword({ action, hidden, error, messages = defaultMessages }: StorefrontNewPasswordProps) {
  const text = messages.storefront
  const field = (id: string, name: string, label: string, hint?: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        required
        minLength={8}
        maxLength={128}
        autoComplete="new-password"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={INPUT}
      />
      {hint ? (
        <span id={`${id}-hint`} className="text-xs text-shop-muted">
          {hint}
        </span>
      ) : null}
    </div>
  )

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background">
      <p className="text-sm text-shop-muted">{text.newPasswordLead}</p>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}

      <form action={action} method="post" className="flex flex-col gap-4">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {field("new-password", "password", text.newPasswordLabel, text.signInPasswordHint)}
        {field("new-password-repeat", "confirmacao", text.newPasswordRepeat)}
        <button type="submit" className="h-12 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90">
          {text.newPasswordSubmit}
        </button>
      </form>
    </section>
  )
}
