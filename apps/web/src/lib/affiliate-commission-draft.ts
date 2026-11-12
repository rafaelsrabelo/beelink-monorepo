// Types
import type { AffiliateCommissionPayload, CommissionTable, Product, ProductCategory } from "@harness-monorepo/contracts"
import type { CommissionTarget, CommissionTreeCategory, CommissionTreeProduct } from "@harness-monorepo/ui/lib/affiliate-wizard"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { formatCents } from "@harness-monorepo/ui/blocks/storefront/storefront-price"
import { format } from "@harness-monorepo/ui/locales/index"

/*
  The commission an invite sets (the user's design, 12/11/2026): it starts from a shared table, and
  stays that table while nothing changes; any change — the base, a category, a product — makes it
  the affiliate's own, starting from that table's rates. Rates are basis points, as on the wire.
*/

export interface CommissionDraft {
  startId: string
  baseBps: number
  categories: Record<string, number>
  products: Record<string, number>
}

type Text = UiMessages["affiliates"]["wizard"]["commission"]

/** The draft a table starts: its own rates, exactly. */
export function draftOf(table: CommissionTable): CommissionDraft {
  return {
    startId: table.id,
    baseBps: table.defaultRateBps,
    categories: Object.fromEntries(table.categoryRates.map((rate) => [rate.categoryId, rate.rateBps])),
    products: Object.fromEntries(table.rates.map((rate) => [rate.productId, rate.rateBps])),
  }
}

const sameRates = (a: Record<string, number>, b: Record<string, number>): boolean => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([id, bps]) => b[id] === bps)

/** Whether anything differs from the table it started from. */
export function draftChanged(draft: CommissionDraft, start: CommissionTable): boolean {
  const seed = draftOf(start)
  return draft.baseBps !== seed.baseBps || !sameRates(draft.categories, seed.categories) || !sameRates(draft.products, seed.products)
}

/** The invite's commission: the shared table when nothing changed, the affiliate's own otherwise. */
export function commissionChoiceOf(draft: CommissionDraft, start: CommissionTable): { tableId: string } | { commission: AffiliateCommissionPayload } {
  if (!draftChanged(draft, start)) return { tableId: start.id }
  return {
    commission: {
      defaultRateBps: draft.baseBps,
      categoryRates: Object.entries(draft.categories).map(([categoryId, rateBps]) => ({ categoryId, rateBps })),
      productRates: Object.entries(draft.products).map(([productId, rateBps]) => ({ productId, rateBps })),
    },
  }
}

const bucket = (target: CommissionTarget): "categories" | "products" => (target.kind === "category" ? "categories" : "products")

/** What a row inherits right now: a category the base; a product its category's own, or the base. */
function inheritedBps(draft: CommissionDraft, target: CommissionTarget, categoryOf: (productId: string) => string | null): number {
  if (target.kind === "category") return draft.baseBps
  const category = categoryOf(target.id)
  return (category ? draft.categories[category] : undefined) ?? draft.baseBps
}

/** A row's own rate, starting from what it inherited — so "Personalizar" changes nothing until moved. */
export function customize(draft: CommissionDraft, target: CommissionTarget, categoryOf: (productId: string) => string | null): CommissionDraft {
  const key = bucket(target)
  return { ...draft, [key]: { ...draft[key], [target.id]: inheritedBps(draft, target, categoryOf) } }
}

export function rate(draft: CommissionDraft, target: CommissionTarget, percent: number): CommissionDraft {
  const key = bucket(target)
  return { ...draft, [key]: { ...draft[key], [target.id]: Math.round(percent * 100) } }
}

export function reset(draft: CommissionDraft, target: CommissionTarget): CommissionDraft {
  const key = bucket(target)
  const { [target.id]: _left, ...rest } = draft[key]
  return { ...draft, [key]: rest }
}

const percentOf = (bps: number): number => bps / 100
const percentText = (bps: number, locale: string): string => `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(percentOf(bps))}%`

/**
 * The exceptions' tree: each category with its products, what every row pays and from where, the
 * products without a category under a name of their own. A search keeps a category whose name hits
 * with all its products, or only the products that hit, and opens what it keeps.
 */
export function commissionTreeOf(input: { categories: readonly ProductCategory[]; products: readonly Product[]; draft: CommissionDraft; search: string; open: ReadonlySet<string>; locale: string; text: Text }): CommissionTreeCategory[] {
  const { draft, locale, text } = input
  const query = input.search.trim().toLocaleLowerCase(locale)
  const hits = (name: string) => name.toLocaleLowerCase(locale).includes(query)
  const groups = [...input.categories.map((category) => ({ id: category.id, name: category.name, customizable: true })), { id: "", name: text.noCategory, customizable: false }]

  return groups.flatMap((group) => {
    const all = input.products.filter((product) => (product.category?.id ?? "") === group.id)
    if (!group.customizable && all.length === 0) return []
    const shown = !query || hits(group.name) ? all : all.filter((product) => hits(product.name))
    if (query && shown.length === 0 && !hits(group.name)) return []

    const ownCategory = group.customizable ? draft.categories[group.id] : undefined
    const categoryBps = ownCategory ?? draft.baseBps
    const products: CommissionTreeProduct[] = shown.map((product) => {
      const own = draft.products[product.id]
      const bps = own ?? categoryBps
      return {
        id: product.id,
        name: product.name,
        price: formatCents(product.priceCents, locale, "BRL"),
        earn: formatCents(Math.floor((product.priceCents * bps) / 10_000), locale, "BRL"),
        own: own !== undefined,
        percent: percentOf(bps),
        inheritLabel: ownCategory !== undefined ? format(text.inheritCategory, { rate: percentText(categoryBps, locale) }) : format(text.inheritBase, { rate: percentText(draft.baseBps, locale) }),
      }
    })
    const ownProducts = all.filter((product) => draft.products[product.id] !== undefined).length
    const count = all.length === 1 ? text.productsOne : format(text.products, { count: String(all.length) })
    const customized = ownProducts === 0 ? "" : ` · ${ownProducts === 1 ? text.customizedOne : format(text.customized, { count: String(ownProducts) })}`

    return [{
      id: group.id || "none",
      name: group.name,
      countLabel: `${count}${customized}`,
      own: ownCategory !== undefined,
      percent: percentOf(categoryBps),
      inheritLabel: format(text.inheritBase, { rate: percentText(draft.baseBps, locale) }),
      open: Boolean(query) || input.open.has(group.id || "none"),
      products,
      customizable: group.customizable,
    }]
  })
}
