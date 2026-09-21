/**
 * The shapes the `store` blocks render.
 *
 * They mirror `@harness-monorepo/contracts` field for field and are restated here on purpose: this
 * package declares no dependency on the wire types, so a block renders in Storybook with nothing
 * behind it — the same reason `dashboard/dashboard-types.ts` restates the signed-in user. Because
 * the shapes are structural, a screen hands a `Store` from the contract straight in.
 */

/**
 * How a shop sells — not what it sells. The storefront's wording follows it. A shop's vertical is
 * its category, a row the platform seeds, which is why one value here is not a placeholder: a
 * second one arrives only when a shop window has to behave differently.
 */
export const STORE_TYPES = ["ECOMMERCE"] as const
export type StoreType = (typeof STORE_TYPES)[number]

/** The storefront template: the plain grid, or the grid under a banner. */
export const STORE_LAYOUT_TYPES = ["DEFAULT", "BANNER"] as const
export type StoreLayoutType = (typeof STORE_LAYOUT_TYPES)[number]

/**
 * How one product card is built: the picture above its text, or beside it. Lower case, unlike the
 * unions around it, because it is a key of the storefront's `layoutSettings` JSON rather than a
 * database enum — see `StoreLayoutSettings.cardLayout` in the contract.
 */
export const STORE_CARD_LAYOUTS = ["grid", "horizontal"] as const
export type StoreCardLayout = (typeof STORE_CARD_LAYOUTS)[number]

/** What the shop takes at the door. A label carried to the shopkeeper, not a gateway. */
export const PAYMENT_METHODS = ["MONEY", "PIX", "CREDIT_CARD", "DEBIT_CARD"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/**
 * The shop's brand colours, each `#RRGGBB`. They are data, never tokens: a block renders them
 * through an inline custom property, so no component here holds a colour of its own.
 */
export interface StoreColors {
  background: string
  primary: string
  text: string
  header: string
}

/** A shop as the shopkeeper's list of shops shows it. */
export interface StoreSummary {
  id: string
  slug: string
  name: string
  type: StoreType
  logoUrl: string | null
}

/** One row of the platform's taxonomy, as the identity tab's select offers it. */
export interface StoreCategoryOption {
  id: string
  name: string
}

/**
 * A palette applied in one click. The name is copy, so the screen supplies the list — this package
 * ships none, which is also why no block needs a colour literal to offer one.
 */
export interface StoreColorPreset {
  id: string
  name: string
  colors: StoreColors
}

/**
 * A field's verdict as a block sees it: react-hook-form's error object, or nothing. The block only
 * renders the sentence inside it; who decided it — the schema or the API — is the screen's business.
 */
export type FieldIssue = { message?: string } | undefined

/** The verdicts for one group of fields, keyed by the field name. */
export type FieldIssues<TValues> = Partial<Record<keyof TValues, FieldIssue>>
