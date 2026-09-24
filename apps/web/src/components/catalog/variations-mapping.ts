// Types
import type {
  ProductDetail,
  ProductImagePayload,
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
  photoValuesOf,
  type VariationRow,
  type VariationsValue,
} from "@harness-monorepo/ui/lib/variations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { boxOf, whole, type FormValues } from "./product-form-mapping"

/** Whether the draft sells more than its one default variant. */
export function hasCombinations(draft: VariationsValue): boolean {
  return combinationCountOf(draft.options) > 0
}

/**
 * The editor's draft of a saved product: its options by id, a row per current variant.
 *
 * The wire has no "colour" flag, so an option is a colour one when a value carries a swatch, or
 * when it is named like the colour preset — a colour option saved before any swatch was picked
 * must not come back as a plain one with no way to get its swatches again.
 */
export function toVariationsDraft(product: ProductDetail, messages: UiMessages): VariationsValue {
  if (product.options.length === 0) return { options: [], rows: {} }
  const colour = messages.catalog.variations.presetColor.toLocaleLowerCase()

  return {
    options: product.options.map((option) => ({
      key: option.id,
      name: option.name,
      isColor:
        option.values.some((value) => value.colorHex !== null) || option.name.trim().toLocaleLowerCase() === colour,
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
          weight: variant.weightGrams === null ? "" : String(variant.weightGrams),
        } satisfies VariationRow,
      ]),
    ),
    // Only the marked photos, as the draft stores them: a photo of every combination has no entry.
    photos: Object.fromEntries(
      product.images.filter((image) => image.optionValueIds.length > 0).map((image) => [image.url, image.optionValueIds]),
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

/** Draft key → the id the API gave it, matched by place: options in order, each with its values in order. */
function savedIds(draft: VariationsValue, saved: ProductDetail): Map<string, string> {
  const ids = new Map<string, string>()
  draft.options
    .filter((option) => option.values.length > 0)
    .forEach((option, index) => {
      const savedOption = saved.options[index]
      if (savedOption) ids.set(option.key, savedOption.id)
      option.values.forEach((value, place) => {
        const id = savedOption?.values[place]?.id
        if (id) ids.set(value.key, id)
      })
    })
  return ids
}

/**
 * The draft with the ids the API gave its new options and values, after a save that stopped past
 * the options. The next save then names them, instead of creating them again and archiving the
 * combinations they had just made.
 */
export function rekeyDraft(draft: VariationsValue, saved: ProductDetail): VariationsValue {
  const ids = savedIds(draft, saved)
  const keyOf = (key: string) => ids.get(key) ?? key

  return {
    options: draft.options.map((option) => ({
      ...option,
      key: keyOf(option.key),
      values: option.values.map((value) => ({ ...value, key: keyOf(value.key) })),
    })),
    rows: Object.fromEntries(
      Object.entries(draft.rows).map(([key, row]) => [combinationKey(key === "" ? [] : key.split("|").map(keyOf)), row]),
    ),
    ...(draft.photos
      ? { photos: Object.fromEntries(Object.entries(draft.photos).map(([url, keys]) => [url, keys.map(keyOf)])) }
      : {}),
  }
}

/**
 * The gallery as the API takes it, once the options are saved: each photo with the ids of the
 * values it is of. A new value is matched to its id by place, as the variants are; a value that
 * is no longer one of the product's is dropped, which leaves its photo of every combination.
 */
export function imagesPayloadOf(urls: readonly string[], draft: VariationsValue, saved: ProductDetail): ProductImagePayload[] {
  const ids = savedIds(draft, saved)
  const current = new Set(saved.options.flatMap((option) => option.values.map((value) => value.id)))

  return urls.map((url) => ({
    url,
    optionValueIds: photoValuesOf(draft, url)
      .map((key) => ids.get(key) ?? key)
      .filter((id) => current.has(id)),
  }))
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
  const keyOfId = new Map([...savedIds(draft, saved)].map(([key, id]) => [id, key]))

  const rows = new Map(combinationsOf(draft, base).map((combination) => [combination.key, combination.row]))

  return saved.variants.flatMap((variant) => {
    const row = rows.get(combinationKey(variant.optionValueIds.map((id) => keyOfId.get(id) ?? id)))
    if (!row) return []
    // A row switched off may have no price; it is still sent, so its switch is saved.
    const priceCents = centsFrom(row.price)
    // The editor has no "was" price per combination; one inherited from the product that this row's
    // price has reached is no discount, and the API would refuse the pair.
    const staleCompareAt =
      priceCents !== null && variant.compareAtPriceCents !== null && variant.compareAtPriceCents <= priceCents

    return [
      {
        id: variant.id,
        isActive: row.isActive,
        ...(priceCents === null ? {} : { priceCents }),
        ...(staleCompareAt ? { compareAtPriceCents: null } : {}),
        sku: row.sku.trim() || null,
        weightGrams: whole(row.weight),
        // Counting and the box are set once, in their own sections, for every combination.
        trackStock: form.trackStock,
        stockQuantity: form.trackStock ? whole(row.stock) : null,
        ...boxOf(form),
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
