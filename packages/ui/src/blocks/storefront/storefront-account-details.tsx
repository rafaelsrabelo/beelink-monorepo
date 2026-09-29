// Libs
import { PencilIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontAccountDetailsProps {
  /** As a person writes it; null when none is on file. */
  phone: string | null
  email: string
  /** On one line; null when none is on file. */
  address: string | null
  /** What is on file is not enough to deliver to — a CEP alone, say: said under it. */
  addressIncomplete?: boolean
  editHref: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * What the shop has of the shopper, as the checkout will use it: how to reach them and where to
 * deliver. A gap is said, not left blank — it is what makes a checkout ask again.
 */
export function StorefrontAccountDetails({
  phone,
  email,
  address,
  addressIncomplete = false,
  editHref,
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: StorefrontAccountDetailsProps) {
  const text = messages.storefront
  const rows = [
    { label: text.accountDetailsPhone, value: phone, missing: text.accountDetailsNoPhone, note: null },
    { label: text.accountDetailsEmail, value: email, missing: null, note: null },
    { label: text.accountAddress, value: address, missing: text.accountDetailsNoAddress, note: address && addressIncomplete ? text.accountDetailsAddressIncomplete : null },
  ]

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-shop-line bg-shop-background p-5 text-shop-on-background shop-md:p-6">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-extrabold">{text.accountDetails}</h2>
        <Link href={editHref} className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-shop-primary-ink hover:underline">
          <PencilIcon aria-hidden="true" className="size-3.5" />
          {text.accountDetailsEdit}
        </Link>
      </div>
      <dl className="grid gap-4 shop-md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,2fr)]">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[11px] font-bold tracking-[0.04em] text-shop-muted uppercase">{row.label}</dt>
            <dd className={row.value ? "text-sm font-semibold break-words" : "text-sm text-shop-muted"}>{row.value ?? row.missing}</dd>
            {row.note ? <dd className="text-[13px] text-shop-muted">{row.note}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  )
}
