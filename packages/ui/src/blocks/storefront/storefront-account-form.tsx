// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** What the page draws of a shopper — the web's `CustomerProfile` fits it as it is. */
export interface StorefrontAccountProfile {
  name: string
  email: string
  phone: string | null
  address: Record<"zipCode" | "street" | "number" | "complement" | "neighborhood" | "city" | "state", string | null>
}

export interface StorefrontAccountFormProps {
  profile: StorefrontAccountProfile
  /** Where the details post; the web's route handler. */
  action: string
  /** Where "Sair" posts. */
  signOutAction: string
  /** Carried through the post: this page, to come back to. */
  hidden?: Readonly<Record<string, string>>
  /** A refusal, already a sentence. */
  error?: string | null
  saved?: boolean
  messages?: UiMessages
}

const INPUT = "h-11 w-full rounded-[10px] border border-shop-line-strong bg-shop-background px-3 text-base text-shop-on-background"
const LABEL = "flex flex-col gap-1 text-sm font-medium"

/**
 * The shopper's page at a shop: their name, phone and delivery address as this shop keeps them, and
 * a way to sign out. A plain form, like the sign-in: it posts and comes back, with no script needed.
 * The e-mail is the account's and is shown, not edited — it is not the shop's to change.
 */
export function StorefrontAccountForm({ profile, action, signOutAction, hidden = {}, error, saved = false, messages = defaultMessages }: StorefrontAccountFormProps) {
  const text = messages.storefront
  const { address } = profile
  const field = (name: string, label: string, value: string | null, extra: Record<string, string | number | boolean> = {}) => (
    <label className={LABEL}>
      {label}
      <input name={name} defaultValue={value ?? ""} className={INPUT} {...extra} />
    </label>
  )

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-5 rounded-xl border border-shop-line bg-shop-background p-6 text-shop-on-background">
      <p className="text-sm text-shop-muted">{text.accountLead}</p>

      {error ? (
        <p role="alert" className="rounded-[10px] border border-shop-sale-ink/30 px-4 py-3 text-sm text-shop-sale-ink">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="rounded-[10px] border border-shop-line bg-shop-fill px-4 py-3 text-sm">
          {text.accountSaved}
        </p>
      ) : null}

      <form action={action} method="post" className="flex flex-col gap-5">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-base font-bold">{text.accountDetails}</legend>
          {field("name", text.signInName, profile.name, { required: true, minLength: 2, maxLength: 120, autoComplete: "name" })}
          <p className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{text.signInEmail}</span>
            <span className="text-shop-muted">{profile.email}</span>
          </p>
          {field("phone", text.accountPhone, profile.phone, { type: "tel", inputMode: "tel", autoComplete: "tel" })}
        </fieldset>

        <fieldset className="grid grid-cols-6 gap-4">
          <legend className="col-span-6 mb-2 text-base font-bold">{text.accountAddress}</legend>
          <div className="col-span-6 shop-sm:col-span-2">{field("zipCode", text.accountZipCode, address.zipCode, { inputMode: "numeric", autoComplete: "postal-code" })}</div>
          <div className="col-span-6 shop-sm:col-span-4">{field("street", text.accountStreet, address.street, { autoComplete: "address-line1" })}</div>
          <div className="col-span-2">{field("number", text.accountNumber, address.number)}</div>
          <div className="col-span-4">{field("complement", text.accountComplement, address.complement, { autoComplete: "address-line2" })}</div>
          <div className="col-span-6 shop-sm:col-span-3">{field("neighborhood", text.accountNeighborhood, address.neighborhood)}</div>
          <div className="col-span-4 shop-sm:col-span-2">{field("city", text.accountCity, address.city, { autoComplete: "address-level2" })}</div>
          <div className="col-span-2 shop-sm:col-span-1">{field("state", text.accountState, address.state, { maxLength: 2, autoComplete: "address-level1" })}</div>
        </fieldset>

        <button type="submit" className="h-12 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90">
          {text.accountSave}
        </button>
      </form>

      <form action={signOutAction} method="post" className="flex justify-center">
        <button type="submit" className="text-sm font-semibold text-shop-muted hover:underline">
          {text.signOut}
        </button>
      </form>
    </section>
  )
}
