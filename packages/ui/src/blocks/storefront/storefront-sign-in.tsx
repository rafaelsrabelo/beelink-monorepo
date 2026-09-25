// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export type StorefrontSignInMode = "entrar" | "criar" | "senha"

export interface StorefrontSignInProps {
  mode: StorefrontSignInMode
  /** Where this face posts: the web's route handler for signing in, up, or asking for a password. */
  action: string
  /** Carried through the post: where to return after, and this page, to come back to on a refusal. */
  hidden: Readonly<Record<string, string>>
  /** Typed before a refusal sent the shopper back here. */
  email?: string
  /** A refusal, already a sentence. */
  error?: string | null
  /** The link is on its way — after signing up or asking for a new password. */
  sent?: boolean
  /** The other faces of this page. */
  hrefs: { signIn: string; signUp: string; forgot: string }
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const INPUT = "h-11 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background"
const LABEL = "flex flex-col gap-1 text-sm font-medium"

/**
 * The shop's own sign-in, sign-up and new-password page, in the shop's colours. A plain `<form>`
 * that posts to the web — no script needed to sign in, and no password ever held by page code.
 * The shop window stays open to anyone: this is a convenience, never a gate to the cart.
 */
export function StorefrontSignIn({ mode, action, hidden, email = "", error, sent = false, hrefs, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontSignInProps) {
  const text = messages.storefront
  const lead = mode === "criar" ? text.signUpLead : mode === "senha" ? text.forgotLead : text.signInLead
  const submit = mode === "criar" ? text.signUpSubmit : mode === "senha" ? text.forgotSubmit : text.signInSubmit

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background">
      <p className="text-sm text-shop-muted">{lead}</p>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}

      {sent ? (
        <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-4 py-3 text-sm">
          {mode === "senha" ? text.forgotSent : format(text.signUpSent, { email })}
        </p>
      ) : (
        <form action={action} method="post" className="flex flex-col gap-4">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {mode === "criar" ? (
            <label className={LABEL}>
              {text.signInName}
              <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={INPUT} />
            </label>
          ) : null}
          <label className={LABEL}>
            {text.signInEmail}
            <input name="email" type="email" required defaultValue={email} autoComplete="email" className={INPUT} />
          </label>
          {mode === "senha" ? null : (
            <div className="flex flex-col gap-1">
              <label htmlFor="sign-in-password" className="text-sm font-medium">
                {text.signInPassword}
              </label>
              <input
                id="sign-in-password"
                name="password"
                type="password"
                required
                minLength={mode === "criar" ? 8 : 1}
                maxLength={128}
                autoComplete={mode === "criar" ? "new-password" : "current-password"}
                aria-describedby={mode === "criar" ? "sign-in-password-hint" : undefined}
                className={INPUT}
              />
              {mode === "criar" ? (
                <span id="sign-in-password-hint" className="text-xs text-shop-muted">
                  {text.signInPasswordHint}
                </span>
              ) : null}
            </div>
          )}
          <button type="submit" className="h-12 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90">
            {submit}
          </button>
        </form>
      )}

      <nav className="flex flex-col items-center gap-2 text-sm">
        {mode === "entrar" ? (
          <>
            <Link href={hrefs.signUp} className="font-semibold text-shop-primary-ink hover:underline">{text.toSignUp}</Link>
            <Link href={hrefs.forgot} className="text-shop-muted hover:underline">{text.toForgot}</Link>
          </>
        ) : (
          <Link href={hrefs.signIn} className="font-semibold text-shop-primary-ink hover:underline">{text.toSignIn}</Link>
        )}
      </nav>
    </section>
  )
}
