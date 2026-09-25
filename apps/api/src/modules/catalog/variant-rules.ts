// Nest
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { ReplaceProductOptionsDto } from './dto/product-options.dto.js';
import type { ProductOptionRow } from './variant.mapper.js';

// App
import { catalogError } from './catalog-slug.service.js';
import { skuTaken } from './product-rules.js';

type Db = Prisma.TransactionClient;

/** Case and surrounding spaces do not make "P" and " p" two sizes. */
function sameName(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR');
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

/** Two options with one name, two values with one name in an option, or one id sent twice. */
export function refuseDuplicateOptions(dto: ReplaceProductOptionsDto): void {
  const optionIds = dto.options.flatMap((option) => (option.id ? [option.id] : []));
  const valueIds = dto.options.flatMap((option) => option.values.flatMap((value) => (value.id ? [value.id] : [])));

  const duplicated =
    hasDuplicates(dto.options.map((option) => sameName(option.name))) ||
    dto.options.some((option) => hasDuplicates(option.values.map((value) => sameName(value.name)))) ||
    hasDuplicates(optionIds) ||
    hasDuplicates(valueIds);

  if (duplicated) {
    throw new BadRequestException(
      catalogError('PRODUCT_OPTION_DUPLICATE', 'Option names, and value names within an option, must differ'),
    );
  }
}

/** An id names an option of this product, or a value of that same option — never another's. */
export function refuseForeignIds(dto: ReplaceProductOptionsDto, options: readonly ProductOptionRow[]): void {
  const byId = new Map(options.map((option) => [option.id, option]));

  for (const sent of dto.options) {
    const current = sent.id ? byId.get(sent.id) : undefined;
    const known = new Set(current?.values.map((value) => value.id) ?? []);
    const foreign = (sent.id && !current) || sent.values.some((value) => value.id && !known.has(value.id));

    if (foreign) {
      throw new NotFoundException(
        catalogError('PRODUCT_OPTION_NOT_FOUND', 'An option or value id is not one of this product’s'),
      );
    }
  }
}

/** A code is one variant's in the shop: across this product's variants and every other product's. */
export async function refuseTakenSkus(
  tx: Db,
  storeId: string,
  productId: string,
  variants: readonly { id: string; sku: string | null }[],
  patches: readonly { current: { id: string }; after: { sku: string | null } }[],
): Promise<void> {
  const after = new Map(variants.map((variant) => [variant.id, variant.sku]));
  for (const { current, after: next } of patches) after.set(current.id, next.sku);

  const codes = [...after.values()].filter((sku): sku is string => sku !== null);
  if (hasDuplicates(codes)) throw skuTaken();

  const sent = patches.flatMap(({ after: next }) => (next.sku === null ? [] : [next.sku]));
  if (sent.length === 0) return;

  const elsewhere = await tx.productVariant.findFirst({
    where: { storeId, sku: { in: sent }, productId: { not: productId } },
    select: { id: true },
  });
  if (elsewhere) throw skuTaken();
}
