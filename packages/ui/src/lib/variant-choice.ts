/**
 * Which combination a visitor has chosen on a product page, and what each value would lead to —
 * pure, so the picker and the page agree and it can be tested without a browser.
 *
 * The shapes are this package's own, structurally the public product's: the design system does not
 * depend on the wire contracts, and the web passes the API's answer straight in.
 */

/**
 * Where the chosen combination goes in a product's order link. The screen builds the WhatsApp link,
 * and the product block, which never knows what wa.me wants, puts " (P · Areia)" — encoded — in its
 * place. Here and not in the block: a value exported from a client module reaches a Server
 * Component as a reference, not as the string.
 */
export const ORDER_VARIANT_MARK = "{variant}"

export interface ChoiceValue {
  id: string
  name: string
  /** `#rrggbb`, the shopkeeper's swatch, or null on an option that is not a colour. */
  colorHex: string | null
}

export interface ChoiceOption {
  id: string
  name: string
  values: readonly ChoiceValue[]
}

export interface ChoiceVariant {
  id: string
  /** One value id per option, in the options' order. */
  optionValueIds: readonly string[]
  priceCents: number
  compareAtPriceCents: number | null
  imageUrl: string | null
  available: boolean
}

/** Option id → the value chosen for it. */
export type Selection = Readonly<Record<string, string>>

/**
 * What a value would lead to, with the other options as they are:
 * - `available`: a combination that can be ordered;
 * - `soldOut`: a combination the shop sells and has none of — choosable, to ask to be told;
 * - `missing`: no such combination; the shop does not sell it.
 */
export type ValueState = "available" | "soldOut" | "missing"

export function selectionOf(variant: ChoiceVariant, options: readonly ChoiceOption[]): Selection {
  return Object.fromEntries(options.map((option, index) => [option.id, variant.optionValueIds[index] ?? ""]))
}

export function variantOf(
  selection: Selection,
  options: readonly ChoiceOption[],
  variants: readonly ChoiceVariant[],
): ChoiceVariant | undefined {
  return variants.find((variant) => options.every((option, index) => variant.optionValueIds[index] === selection[option.id]))
}

/** The one asked for by the address, else the first that can be ordered, else the first. */
export function initialVariantOf(variants: readonly ChoiceVariant[], wanted?: string | null): ChoiceVariant | undefined {
  return variants.find((variant) => variant.id === wanted) ?? variants.find((variant) => variant.available) ?? variants[0]
}

export function valueStateOf(
  selection: Selection,
  optionId: string,
  valueId: string,
  options: readonly ChoiceOption[],
  variants: readonly ChoiceVariant[],
): ValueState {
  const variant = variantOf({ ...selection, [optionId]: valueId }, options, variants)
  if (!variant) return "missing"
  return variant.available ? "available" : "soldOut"
}

/** "P · Areia", as the order message and the restock request name it. */
export function variantLabelOf(variant: ChoiceVariant, options: readonly ChoiceOption[]): string {
  return options
    .map((option, index) => option.values.find((value) => value.id === variant.optionValueIds[index])?.name)
    .filter((name): name is string => Boolean(name))
    .join(" · ")
}
