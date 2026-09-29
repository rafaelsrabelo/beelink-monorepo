// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export type StorefrontLinkSpentProps = {
  linkComponent?: LinkComponent
  messages?: UiMessages
} & (
  | {
      /** A confirmation link: another is sent from here, to the e-mail typed. */
      kind: "confirm"
      /** Where "Mandar outro link" posts; the web's route handler. */
      action: string
      /** Carried through the post: where to go back to, and the page that says the link is on its way. */
      hidden: Readonly<Record<string, string>>
    }
  | {
      /** A new-password link: another is asked for where the first one was. */
      kind: "reset"
      /** The shop's "esqueci a senha". */
      askHref: string
    }
)

const PRIMARY = "flex h-12 items-center justify-center rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90"

/**
 * An e-mailed link that no longer works — used, or past its time — said at the shop, with the way
 * to another: sent from here for a confirmation, asked for again for a new password. The shopper
 * never lands on a dead end, nor on the panel's pages.
 */
export function StorefrontLinkSpent(props: StorefrontLinkSpentProps) {
  const { linkComponent: Link = AnchorLink, messages = defaultMessages } = props
  const text = messages.storefront

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background">
      <p className="text-sm">{props.kind === "confirm" ? text.linkSpentVerify : text.linkSpentReset}</p>

      {props.kind === "confirm" ? (
        <form action={props.action} method="post" className="flex flex-col gap-4">
          {Object.entries(props.hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <label className="flex flex-col gap-1 text-sm font-medium">
            {text.signInEmail}
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11 rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background"
            />
          </label>
          <button type="submit" className={PRIMARY}>
            {text.linkResend}
          </button>
        </form>
      ) : (
        <Link href={props.askHref} className={PRIMARY}>
          {text.linkAskAgain}
        </Link>
      )}
    </section>
  )
}
