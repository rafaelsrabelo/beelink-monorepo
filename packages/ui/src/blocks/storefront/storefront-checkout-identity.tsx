"use client"

// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Lib
import { withParts } from "@harness-monorepo/ui/lib/text-parts"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontCheckoutIdentityProps {
  /** Who is buying; or, for an e-mail that already has an account at the shop, the code e-mailed to it. */
  step: "form" | "code"
  /** The e-mail typed: carried into the code step, and back into a refused form. */
  email: string | null
  /** Where each plain form posts: the web's handlers. */
  actions: { identify: string; code: string; resend: string }
  /** Carried through every post: where to land back — the checkout. */
  hidden: Readonly<Record<string, string>>
  /** Back to the form, from the code step, to buy with another e-mail. */
  otherEmailHref: string
  /** Signing in with a password or Google, and signing up with one — each coming back to the cart. */
  hrefs: { signIn: string; signUp: string; terms: string; privacy: string }
  /** A refusal, already a sentence. */
  error?: string | null
  /** What the last press did, already a sentence: a new code sent. */
  notice?: string | null
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
 * Who is buying, in place of "sign in to order": a name, an e-mail and a WhatsApp — no password, no
 * e-mail to open first — and the account is what the purchase leaves behind. Going on accepts
 * bee-link's terms, said beside the button. Signing in, or opening an account with a password, stay
 * a link away.
 *
 * An e-mail that already has an account at the shop is asked for the six digits sent to it: typed or
 * filled in by the phone (`one-time-code`), a new one asked for, or another e-mail used instead. Plain
 * forms, so it all works before the page's script does.
 */
export function StorefrontCheckoutIdentity({
  step,
  email,
  actions,
  hidden,
  otherEmailHref,
  hrefs,
  error,
  notice,
  headless = false,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontCheckoutIdentityProps) {
  const text = messages.storefront
  const legal = messages.legal
  const id = useId()
  const frame = headless ? "flex flex-col gap-4" : "flex flex-col gap-4 rounded-[10px] border border-shop-line bg-shop-fill p-4"
  const Heading = headless ? "h3" : "h2"
  const Frame = headless ? "div" : "section"
  const carried = Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)
  const said = (
    <>
      {error ? (
        <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}
      {notice ? <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-4 py-3 text-sm">{notice}</p> : null}
    </>
  )

  if (step === "code" && email) {
    return (
      <section aria-labelledby={`${id}-title`} className={frame}>
        <Heading id={`${id}-title`} className="text-base font-bold">
          {text.checkoutCodeTitle}
        </Heading>
        <p className="text-sm break-words">{format(text.checkoutCodeSent, { email })}</p>
        {said}
        <form action={actions.code} method="post" className="flex flex-col gap-3">
          {carried}
          <input type="hidden" name="email" value={email} />
          <label className={LABEL}>
            {text.checkoutCodeLabel}
            {/* Reached by the shopper's own press: the keyboard comes up on the code. */}
            <input
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{3}\s?\d{3}"
              maxLength={7}
              autoFocus
              aria-describedby={`${id}-code-hint`}
              className={`${INPUT} tracking-[0.3em]`}
            />
          </label>
          <p id={`${id}-code-hint`} className="-mt-1 text-xs text-shop-muted">
            {text.checkoutCodeHint}
          </p>
          <button type="submit" className={PRIMARY}>
            {text.checkoutCodeConfirm}
          </button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <form action={actions.resend} method="post">
            {carried}
            <input type="hidden" name="email" value={email} />
            <button type="submit" className={`min-h-11 ${LINK}`}>
              {text.checkoutCodeResend}
            </button>
          </form>
          <Link href={otherEmailHref} className="text-shop-muted hover:underline">
            {text.checkoutCodeOtherEmail}
          </Link>
        </div>
      </section>
    )
  }

  const links = {
    terms: <Link href={hrefs.terms} className="underline hover:text-shop-on-background">{legal.terms}</Link>,
    privacy: <Link href={hrefs.privacy} className="underline hover:text-shop-on-background">{legal.privacy}</Link>,
  }
  return (
    <Frame {...(headless ? {} : { "aria-labelledby": `${id}-title` })} className={frame}>
      <div className="flex flex-col gap-1">
        {headless ? null : (
          <h2 id={`${id}-title`} className="text-base font-bold">
            {text.checkoutIdentityTitle}
          </h2>
        )}
        <p className="text-sm text-shop-muted">{text.checkoutIdentityLead}</p>
      </div>
      {said}
      <form action={actions.identify} method="post" className="flex flex-col gap-3">
        {carried}
        <label className={LABEL}>
          {text.checkoutIdentityName}
          <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={INPUT} />
        </label>
        <label className={LABEL}>
          {text.checkoutIdentityEmail}
          <input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={email ?? ""} className={INPUT} />
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
        <button type="submit" className={PRIMARY}>
          {text.checkoutIdentityContinue}
        </button>
        {/* Going on opens the account, and so accepts bee-link's terms (BEELINK-171): said here, beside the button. */}
        <p className="text-center text-xs text-shop-muted">{withParts(legal.checkoutNotice, links)}</p>
      </form>
      <div className="flex flex-col items-center gap-1 text-sm">
        <p>{withParts(text.checkoutIdentityHasAccount, { signIn: <Link href={hrefs.signIn} className={LINK}>{text.checkoutIdentitySignIn}</Link> })}</p>
        <p className="text-shop-muted">{withParts(text.checkoutIdentityWithPassword, { signUp: <Link href={hrefs.signUp} className={LINK}>{text.checkoutSignUp}</Link> })}</p>
      </div>
    </Frame>
  )
}
