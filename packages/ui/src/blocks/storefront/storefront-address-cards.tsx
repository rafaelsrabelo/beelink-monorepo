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
  /** Where "Remover" asks first: the same page, with this card waiting for a yes. */
  removeHref: string
}

export interface StorefrontAddressCardsProps {
  addresses: readonly StorefrontAddressCard[]
  /** Where "Adicionar endereço" opens the form; null once the shopper keeps the most they may. */
  addHref: string | null
  /** The most a shopper keeps, said in place of "Adicionar endereço" once reached. */
  limit: number
  /** Where a confirmed "Remover" posts, with the address's `id`. */
  removeAction: string
  /** Where "Tornar padrão" posts, with the address's `id`. */
  defaultAction: string
  /** The card whose removal waits for a yes; null when none does. */
  confirming?: string | null
  /** Where "Cancelar" leaves a removal unconfirmed: the cards as they were. */
  cancelHref: string
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
 * page and made the default by a form of one button, so it all works with no script. Removing asks
 * first, on the card itself: saved data is not deleted by a single slip. The first tile adds another,
 * until the shopper keeps the most they may.
 */
export function StorefrontAddressCards({
  addresses,
  addHref,
  limit,
  removeAction,
  defaultAction,
  confirming = null,
  cancelHref,
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
    <section id="enderecos" aria-labelledby={headingId} className="flex w-full scroll-mt-[calc(var(--shop-masthead-height,160px)+16px)] max-w-3xl flex-col gap-4 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background">
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
        {addresses.map((address) => {
          // Two addresses may share a heading — no name, the same recipient — so the street tells them apart.
          const name = [address.heading, address.lines[0]].filter(Boolean).join(", ")
          const post = (action: string, label: string, said: string) => (
            <form action={action} method="post">
              {carried}
              <input type="hidden" name="id" value={address.id} />
              <button type="submit" className={ACTION} aria-label={format(label, { name })}>
                {said}
              </button>
            </form>
          )

          return (
            <li key={address.id} id={`endereco-${address.id}`} className="flex scroll-mt-[calc(var(--shop-masthead-height,160px)+16px)] flex-col overflow-hidden rounded-xl border border-shop-line-strong">
              <span className={`border-b border-shop-line px-3.5 py-1.5 text-xs font-bold uppercase text-shop-muted ${address.isDefault ? "bg-shop-fill" : ""}`}>
                {address.isDefault ? text.addressesDefault : <span aria-hidden="true">&nbsp;</span>}
              </span>
              <div className="flex grow flex-col gap-0.5 p-3.5 text-sm leading-relaxed">
                <h3 className="font-bold break-words">{address.heading}</h3>
                {address.lines.map((line) => (
                  <p key={line} className="break-words">
                    {line}
                  </p>
                ))}
              </div>
              {confirming === address.id ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-shop-line bg-shop-fill px-3.5 py-3">
                  <p className="w-full text-sm font-semibold">{text.addressesRemoveAsk}</p>
                  {post(removeAction, text.addressesRemoveLabel, text.addressesRemove)}
                  <Link href={cancelHref} className="text-sm font-semibold text-shop-muted hover:underline">
                    {text.addressCancel}
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 pb-3.5">
                  <Link href={address.editHref} className={ACTION} aria-label={format(text.addressesEditLabel, { name })}>
                    {text.addressesEdit}
                  </Link>
                  <Link href={address.removeHref} className={ACTION} aria-label={format(text.addressesRemoveLabel, { name })}>
                    {text.addressesRemove}
                  </Link>
                  {address.isDefault ? null : post(defaultAction, text.addressesMakeDefaultLabel, text.addressesMakeDefault)}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {addHref ? null : <p className="text-sm text-shop-muted">{format(text.addressesLimit, { count: String(limit) })}</p>}
    </section>
  )
}
