// Libs
import { z } from 'zod';

// Types
import type { ProductImportDraft, ProductImportDraftOption } from '@harness-monorepo/contracts';

// App
import {
  CATEGORY_NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  OPTION_NAME_MAX_LENGTH,
  OPTION_VALUE_NAME_MAX_LENGTH,
  PRICE_CENTS_MAX,
  PRODUCT_NAME_MAX_LENGTH,
  PRODUCT_VARIANTS_MAX,
} from './catalog.constants.js';
import { PRODUCT_IMPORT_MAX } from './product-import.constants.js';
import { slugify } from '../../shared/slug.js';

/**
 * The shape the reader is held to, as structured output. Plain types and descriptions only: the
 * lengths, the bounds and the dedupe are enforced by `draftsFrom` below, where a breach is trimmed
 * rather than failing the whole read over one long name.
 */
export const extractionSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().describe('As printed in the document, in its language. No price, no code.'),
      description: z.string().nullable().describe('Only what the document says of it; null when it says nothing.'),
      priceCents: z
        .number()
        .nullable()
        .describe('Whole cents of BRL: "R$ 5,00" is 500, "R$ 12,90" is 1290. Null when no price is shown for it.'),
      categoryName: z
        .string()
        .nullable()
        .describe("The section it is listed under. One of the shop's own category names when one fits."),
      option: z
        .object({
          name: z.string().describe('What varies: "Sabor", "Tamanho".'),
          values: z.array(
            z.object({
              name: z.string(),
              priceCents: z.number().nullable().describe('Whole cents, only when this value has a price of its own.'),
            }),
          ),
        })
        .nullable()
        .describe('One item offered in several flavours or sizes. Null for a product sold one way.'),
    }),
  ),
});

export type Extraction = z.infer<typeof extractionSchema>;

type RawDraft = Extraction['products'][number];

/** Whitespace folded, ends trimmed, cut at the column's length. Empty is null. */
function textOf(value: string | null | undefined, max: number): string | null {
  const folded = (value ?? '').replace(/\s+/g, ' ').trim().slice(0, max).trim();
  return folded === '' ? null : folded;
}

/** A description keeps its line breaks: a menu writes "Ingredientes:" on a line of its own. */
function descriptionOf(value: string | null | undefined): string | null {
  const kept = (value ?? '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, DESCRIPTION_MAX_LENGTH).trim();
  return kept === '' ? null : kept;
}

/** Whole cents within the catalogue's bounds, or null: a negative or absurd number is not a price. */
function centsOf(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const cents = Math.round(value);
  return cents >= 0 && cents <= PRICE_CENTS_MAX ? cents : null;
}

/**
 * The option as the catalogue can hold it, or null. One value is not a choice; two values that
 * differ only in case ("Morango", "morango") are one, as `refuseDuplicateOptions` counts them.
 */
function optionOf(raw: RawDraft['option']): ProductImportDraftOption | null {
  const name = textOf(raw?.name, OPTION_NAME_MAX_LENGTH);
  if (!raw || !name) return null;

  const seen = new Set<string>();
  const values = raw.values.flatMap((value) => {
    const valueName = textOf(value.name, OPTION_VALUE_NAME_MAX_LENGTH);
    const key = valueName ? valueName.toLocaleLowerCase('pt-BR') : '';
    if (!valueName || seen.has(key)) return [];
    seen.add(key);
    return [{ name: valueName, priceCents: centsOf(value.priceCents) }];
  });

  return values.length >= 2 ? { name, values: values.slice(0, PRODUCT_VARIANTS_MAX) } : null;
}

/**
 * The product's price and its values' prices, made to agree. A product the document priced only
 * by size takes its cheapest size, which is what its card says "from"; a value priced the same as
 * the product has no price of its own.
 */
function pricedOf(priceCents: number | null, option: ProductImportDraftOption | null) {
  if (!option) return { priceCents, option };

  const valuePrices = option.values.flatMap((value) => (value.priceCents === null ? [] : [value.priceCents]));
  const base = priceCents ?? (valuePrices.length > 0 ? Math.min(...valuePrices) : null);

  return {
    priceCents: base,
    option: {
      ...option,
      values: option.values.map((value) => ({
        ...value,
        priceCents: value.priceCents === base ? null : value.priceCents,
      })),
    },
  };
}

/**
 * What the reader answered, as drafts the catalogue could hold. Every limit the import's DTO will
 * check is met here, so a review the shopkeeper did not touch is an import the API accepts.
 */
export function draftsFrom(products: readonly RawDraft[]): ProductImportDraft[] {
  return products
    .flatMap((raw) => {
      const name = textOf(raw.name, PRODUCT_NAME_MAX_LENGTH);
      // Two letters is the shortest name a product may have, and one that slugifies to nothing
      // ("—", "***") is a line of decoration the reader mistook for a product.
      if (!name || name.length < 2 || slugify(name) === '') return [];

      const { priceCents, option } = pricedOf(centsOf(raw.priceCents), optionOf(raw.option));

      return [
        {
          name,
          description: descriptionOf(raw.description),
          priceCents,
          categoryName: textOf(raw.categoryName, CATEGORY_NAME_MAX_LENGTH),
          option,
        } satisfies ProductImportDraft,
      ];
    })
    .slice(0, PRODUCT_IMPORT_MAX);
}
