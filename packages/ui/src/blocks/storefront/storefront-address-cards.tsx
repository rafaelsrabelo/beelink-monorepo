// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontAddressCard {
  id: string
  /** "Casa · Rafael Souza"; who receives alone when the address has no name. */
  heading: string
  /** The address a line each: street and number, neighbourhood and city, the ZIP code. */
  lines: readonly string[]
  isDefault: boolean
  editHref: string
}

export interface StorefrontAddressCardsProps {
  addresses: readonly StorefrontAddressCard[]
  /** Where "Adicionar endereço" opens the form; null once the shopper keeps the most they may. */
  addHref: string | null
  /** The most a shopper keeps, said in place of "Adicionar endereço" once reached. */
  limit: number
  /** Where "Remover" posts, with the address's `id`. */
  removeAction: string
  /** Where "Tornar padrão" posts, with the address's `id`. */
  defaultAction: string
  /** Carried through each post: this page, to come back to. */
  hidden?: Readonly<Record<string, string>>
  /** What the last change came back with, already a sentence. */
  notice?: string | null
  /** A refused change, already a sentence. */
  error?: string | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const ACTION = "text-sm font-semibold text-shop-primary-ink hover:underline"

/**
 * The shopper's addresses as cards, the default first and marked: each one edited through its own
 * page, removed or made the default by a form of one button — so it all works with no script. The
 * first tile adds another, until the shopper keeps the most they may.
 */
export function StorefrontAddressCards({
  addresses,
  addHref,
  limit,
  removeAction,
  defaultAction,
  hidden = {},
  notice,
  error,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontAddressCardsProps) {
  const text = messages.storefront
  const headingId = useId()
  const carried = Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)

  return (
    <section id="enderecos" aria-labelledby={headingId} className="flex w-full max-w-3xl flex-col gap-4 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background">
      <h2 id={headingId} className="text-base font-bold">
        {text.addressesTitle}
      </h2>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-4 py-3 text-sm">
          {notice}
        </p>
      ) : null}

      <ul className="grid gap-4 shop-sm:grid-cols-2">
        {addHref ? (
          <li>
            <Link
              href={addHref}
              className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-shop-line-strong text-sm font-bold hover:bg-shop-fill"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {text.addressesAdd}
            </Link>
          </li>
        ) : null}
        {addresses.map((address) => (
          <li key={address.id} className="flex flex-col overflow-hidden rounded-xl border border-shop-line-strong">
            <span className={`border-b border-shop-line px-3.5 py-1.5 text-xs font-bold uppercase text-shop-muted ${address.isDefault ? "bg-shop-fill" : ""}`}>
              {address.isDefault ? text.addressesDefault : <span aria-hidden="true">&nbsp;</span>}
            </span>
            <div className="flex grow flex-col gap-0.5 p-3.5 text-sm leading-relaxed">
              <p className="font-bold break-words">{address.heading}</p>
              {address.lines.map((line) => (
                <p key={line} className="break-words">
                  {line}
                </p>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 pb-3.5">
              <Link href={address.editHref} className={ACTION} aria-label={format(text.addressesEditLabel, { name: address.heading })}>
                {text.addressesEdit}
              </Link>
              <form action={removeAction} method="post">
                {carried}
                <input type="hidden" name="id" value={address.id} />
                <button type="submit" className={ACTION} aria-label={format(text.addressesRemoveLabel, { name: address.heading })}>
                  {text.addressesRemove}
                </button>
              </form>
              {address.isDefault ? null : (
                <form action={defaultAction} method="post">
                  {carried}
                  <input type="hidden" name="id" value={address.id} />
                  <button type="submit" className={ACTION} aria-label={format(text.addressesMakeDefaultLabel, { name: address.heading })}>
                    {text.addressesMakeDefault}
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      {addHref ? null : <p className="text-sm text-shop-muted">{format(text.addressesLimit, { count: String(limit) })}</p>}
    </section>
  )
}
