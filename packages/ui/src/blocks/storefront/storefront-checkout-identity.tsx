"use client"

// React
import { useId } from "react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Lib
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontCheckoutIdentityProps {
  /** The e-mail typed, back into a refused form. */
  email: string | null
  /** Where the form posts: the web's handler. */
  action: string
  /** Carried through the post: where to land back — the checkout. */
  hidden: Readonly<Record<string, string>>
  /** Signing in with a password or Google, and signing up with one — each optional, each coming back to the cart. */
  hrefs: { signIn: string; signUp: string; terms: string; privacy: string }
  /** A refusal, already a sentence. */
  error?: string | null
  /** Inside a step of the checkout, which says "Seus dados" itself: no frame and no title of its own. */
  headless?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const INPUT = "h-11 w-full rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background"
const LABEL = "flex flex-col gap-1 text-sm font-medium"
const PRIMARY = "h-12 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90"
const LINK = "font-semibold text-shop-primary-ink hover:underline"

/**
 * Who is buying, at a visitor's checkout (plan 2026-11-06--P0-checkout-sem-codigo): a name, a WhatsApp
 * and an e-mail, and "Continuar" goes on to the delivery — no password, no code, no account, whatever the
 * e-mail. Going on accepts bee-link's terms, said beside the button. Signing in stays a link away, for
 * whoever wants their account; buying never asks for it. A plain form.
 */
export function StorefrontCheckoutIdentity({ email, action, hidden, hrefs, error, headless = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontCheckoutIdentityProps) {
  const text = messages.storefront
  const legal = messages.legal
  const id = useId()
  const Frame = headless ? "div" : "section"
  const links = {
    terms: <Link href={hrefs.terms} className="underline hover:text-shop-on-background">{legal.terms}</Link>,
    privacy: <Link href={hrefs.privacy} className="underline hover:text-shop-on-background">{legal.privacy}</Link>,
  }

  return (
    <Frame
      {...(headless ? {} : { "aria-labelledby": `${id}-title` })}
      className={headless ? "flex flex-col gap-4" : "flex flex-col gap-4 rounded-[10px] border border-shop-line bg-shop-fill p-4"}
    >
      <div className="flex flex-col gap-1">
        {headless ? null : (
          <h2 id={`${id}-title`} className="text-base font-bold">
            {text.checkoutIdentityTitle}
          </h2>
        )}
        <p className="text-sm text-shop-muted">{text.checkoutIdentityLead}</p>
      </div>
      {error ? (
        <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}
      <form action={action} method="post" className="flex flex-col gap-3">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <label className={LABEL}>
          {text.checkoutIdentityName}
          <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={INPUT} />
        </label>
        <label className={LABEL}>
          {text.checkoutIdentityPhone}
          <input
            name="phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 99999-8888"
            pattern="[0-9\s\(\)\+\-]{10,20}"
            aria-describedby={`${id}-phone-hint`}
            className={INPUT}
          />
        </label>
        <p id={`${id}-phone-hint`} className="-mt-1 text-xs text-shop-muted">
          {text.checkoutIdentityPhoneHint}
        </p>
        <label className={LABEL}>
          {text.checkoutIdentityEmail}
          <input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={email ?? ""} className={INPUT} />
        </label>
        <button type="submit" className={PRIMARY}>
          {text.checkoutIdentityContinue}
        </button>
        {/* Going on is accepting bee-link's terms (BEELINK-171): said here, beside the button. */}
        <p className="text-center text-xs text-shop-muted">{withParts(legal.checkoutNotice, links)}</p>
      </form>
      <div className="flex flex-col items-center gap-1 text-sm">
        <p>{withParts(text.checkoutIdentityHasAccount, { signIn: <Link href={hrefs.signIn} className={LINK}>{text.checkoutIdentitySignIn}</Link> })}</p>
        <p className="text-shop-muted">{withParts(text.checkoutIdentityWithPassword, { signUp: <Link href={hrefs.signUp} className={LINK}>{text.checkoutSignUp}</Link> })}</p>
      </div>
    </Frame>
  )
}
