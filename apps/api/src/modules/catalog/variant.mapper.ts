// Types
import type {
  ProductDetail,
  ProductOption as WireProductOption,
  ProductVariant as WireProductVariant,
} from '@harness-monorepo/contracts';
import type {
  ProductOptionModel,
  ProductOptionValueModel,
  ProductVariantModel,
  ProductVariantValueModel,
} from '../../generated/prisma/models.js';
import type { ProductInclude } from '../../generated/prisma/models/Product.js';

// App
import { productInclude, toProduct } from './catalog.mapper.js';
import type { ProductRow } from './catalog.mapper.js';

export type ProductOptionRow = ProductOptionModel & { values: ProductOptionValueModel[] };
export type ProductVariantRow = ProductVariantModel & { values: ProductVariantValueModel[] };
export type ProductDetailRow = ProductRow & { options: ProductOptionRow[]; variants: ProductVariantRow[] };

/**
 * The editor's read: the product with its options and its current variants. Kept apart from
 * `productInclude` because the panel's list and the storefront grid read up to 96 products at once,
 * and none of them needs a product's hundred variants.
 */
export const productDetailInclude = {
  ...productInclude,
  options: {
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: { values: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
  },
  variants: {
    where: { archivedAt: null },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: { values: true },
  },
} satisfies ProductInclude;

function toProductOption(row: ProductOptionRow): WireProductOption {
  return {
    id: row.id,
    name: row.name,
    values: row.values.map((value) => ({ id: value.id, name: value.name, colorHex: value.colorHex })),
  } satisfies WireProductOption;
}

/** `optionValueIds` follows the options' order, which the join rows do not carry. */
function toProductVariant(row: ProductVariantRow, options: readonly ProductOptionRow[]): WireProductVariant {
  const valueByOption = new Map(row.values.map((value) => [value.optionId, value.valueId]));

  return {
    id: row.id,
    optionValueIds: options.flatMap((option) => {
      const valueId = valueByOption.get(option.id);
      return valueId ? [valueId] : [];
    }),
    isActive: row.isActive,
    priceCents: row.priceCents,
    compareAtPriceCents: row.compareAtPriceCents,
    costCents: row.costCents,
    sku: row.sku,
    barcode: row.barcode,
    trackStock: row.trackStock,
    stockQuantity: row.stockQuantity,
    weightGrams: row.weightGrams,
    lengthMm: row.lengthMm,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    imageUrl: row.imageUrl,
  } satisfies WireProductVariant;
}

export function toProductDetail(row: ProductDetailRow): ProductDetail {
  return {
    ...toProduct(row),
    options: row.options.map(toProductOption),
    variants: row.variants.map((variant) => toProductVariant(variant, row.options)),
  } satisfies ProductDetail;
}
