// Types
import type {
  ProductDetail,
  ProductVariantPayload,
  ReplaceProductOptionsPayload,
} from "@harness-monorepo/contracts"

// UI
import { centsFrom, reaisFrom } from "@harness-monorepo/ui/lib/money"
import {
  combinationCountOf,
  combinationKey,
  combinationsOf,
  isNewKey,
  labelOf,
  type VariationRow,
  type VariationsValue,
} from "@harness-monorepo/ui/lib/variations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { shippingOf, whole, type FormValues } from "./product-form-mapping"

/** Whether the draft sells more than its one default variant. */
export function hasCombinations(draft: VariationsValue): boolean {
  return combinationCountOf(draft.options) > 0
}

/** The editor's draft of a saved product: its options by id, a row per current variant. */
export function toVariationsDraft(product: ProductDetail): VariationsValue {
  if (product.options.length === 0) return { options: [], rows: {} }

  return {
    options: product.options.map((option) => ({
      key: option.id,
      name: option.name,
      isColor: option.values.some((value) => value.colorHex !== null),
      values: option.values.map((value) => ({ key: value.id, name: value.name, colorHex: value.colorHex })),
    })),
    rows: Object.fromEntries(
      product.variants.map((variant) => [
        combinationKey(variant.optionValueIds),
        {
          isActive: variant.isActive,
          price: reaisFrom(variant.priceCents),
          stock: variant.stockQuantity === null ? "" : String(variant.stockQuantity),
          sku: variant.sku ?? "",
        } satisfies VariationRow,
      ]),
    ),
  }
}

/** The options as the API takes them: only the ones with values, ids only for what it has seen. */
export function optionsPayloadOf(draft: VariationsValue): ReplaceProductOptionsPayload {
  return {
    options: draft.options
      .filter((option) => option.values.length > 0)
      .map((option) => ({
        ...(isNewKey(option.key) ? {} : { id: option.key }),
        name: option.name.trim(),
        values: option.values.map((value) => ({
          ...(isNewKey(value.key) ? {} : { id: value.key }),
          name: value.name.trim(),
          colorHex: value.colorHex,
        })),
      })),
  }
}

/**
 * Every current variant's row, once the options are saved.
 *
 * A value the API had not seen before is matched to the id it was given by its place: the options
 * were sent in order, each with its values in order, and the answer keeps that order.
 */
export function variantsPayloadOf(
  draft: VariationsValue,
  saved: ProductDetail,
  base: VariationRow,
  form: FormValues,
): ProductVariantPayload[] {
  const keyOfId = new Map<string, string>()
  draft.options
    .filter((option) => option.values.length > 0)
    .forEach((option, index) =>
      option.values.forEach((value, place) => {
        const id = saved.options[index]?.values[place]?.id
        if (id) keyOfId.set(id, value.key)
      }),
    )

  const rows = new Map(combinationsOf(draft, base).map((combination) => [combination.key, combination.row]))

  return saved.variants.flatMap((variant) => {
    const row = rows.get(combinationKey(variant.optionValueIds.map((id) => keyOfId.get(id) ?? id)))
    const priceCents = row ? centsFrom(row.price) : null
    if (!row || priceCents === null) return []

    return [
      {
        id: variant.id,
        isActive: row.isActive,
        priceCents,
        sku: row.sku.trim() || null,
        // Counting and the box are set once, in their own sections, for every combination.
        trackStock: form.trackStock,
        stockQuantity: form.trackStock ? whole(row.stock) : null,
        ...shippingOf(form),
      },
    ]
  })
}

/** What stops a save, per option and per row, in the reader's words. */
export function variationIssuesOf(draft: VariationsValue, base: VariationRow, messages: UiMessages) {
  const text = messages.catalog.variations
  const options: Record<string, string> = {}
  const rows: Record<string, string> = {}

  for (const option of draft.options) {
    if (!option.name.trim()) options[option.key] = text.optionNameRequired
    else if (option.values.length === 0) options[option.key] = text.valuesRequired
  }
  for (const combination of combinationsOf(draft, base)) {
    if (combination.row.isActive && centsFrom(combination.row.price) === null) {
      rows[combination.key] = format(text.priceRequired, { label: labelOf(combination.values) })
    }
  }

  const blocked =
    Object.keys(options).length > 0 || Object.keys(rows).length > 0 || combinationCountOf(draft.options) > 100
  return { options, rows, blocked }
}
