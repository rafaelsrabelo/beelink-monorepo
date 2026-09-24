// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { ReplaceProductOptionsDto } from './dto/product-options.dto.js';
import type { ProductOptionRow, ProductVariantRow } from './variant.mapper.js';
import type { OptionShape, VariantPlan } from './variant-combinations.js';

type Db = Prisma.TransactionClient;

/** Writes the options and values as sent, and answers their ids in order. */
export async function writeOptions(
  tx: Db,
  productId: string,
  dto: ReplaceProductOptionsDto,
  current: readonly ProductOptionRow[],
): Promise<OptionShape[]> {
  const kept = dto.options.flatMap((option) => (option.id ? [option.id] : []));
  await tx.productOption.deleteMany({ where: { productId, id: { notIn: kept } } });

  const shapes: OptionShape[] = [];
  for (const [position, sent] of dto.options.entries()) {
    const option = sent.id
      ? await tx.productOption.update({ where: { id: sent.id }, data: { name: sent.name, position } })
      : await tx.productOption.create({ data: { productId, name: sent.name, position } });

    if (sent.id) {
      const keptValues = sent.values.flatMap((value) => (value.id ? [value.id] : []));
      const removed = current.find((row) => row.id === sent.id)?.values.filter((value) => !keptValues.includes(value.id));
      if (removed?.length) await tx.productOptionValue.deleteMany({ where: { id: { in: removed.map((value) => value.id) } } });
    }

    const valueIds: string[] = [];
    for (const [valuePosition, value] of sent.values.entries()) {
      const data = { name: value.name, colorHex: value.colorHex ?? null, position: valuePosition };
      const written = value.id
        ? await tx.productOptionValue.update({ where: { id: value.id }, data })
        : await tx.productOptionValue.create({ data: { ...data, optionId: option.id } });
      valueIds.push(written.id);
    }

    shapes.push({ id: option.id, valueIds });
  }

  return shapes;
}

/**
 * Archives what lost its combination, creates what is new with a neighbour's price, and points
 * every current variant at its values. An archived variant releases its code and stops selling.
 */
export async function applyPlan(
  tx: Db,
  storeId: string,
  productId: string,
  shapes: readonly OptionShape[],
  plan: VariantPlan,
  variants: readonly ProductVariantRow[],
): Promise<void> {
  const byId = new Map(variants.map((variant) => [variant.id, variant]));

  if (plan.archive.length > 0) {
    await tx.productVariant.updateMany({
      where: { id: { in: plan.archive } },
      data: { archivedAt: new Date(), sku: null, isActive: false },
    });
  }

  const created = await tx.productVariant.createManyAndReturn({
    data: plan.create.map(({ donorId, position }) => {
      const donor = byId.get(donorId)!;
      // The price, the box and whether it is counted come from the neighbour; the code, the photo
      // and the stock do not — they describe one physical thing, and this is another.
      return {
        productId,
        storeId,
        position,
        priceCents: donor.priceCents,
        compareAtPriceCents: donor.compareAtPriceCents,
        costCents: donor.costCents,
        trackStock: donor.trackStock,
        stockQuantity: donor.trackStock ? 0 : null,
        weightGrams: donor.weightGrams,
        lengthMm: donor.lengthMm,
        widthMm: donor.widthMm,
        heightMm: donor.heightMm,
      };
    }),
    select: { id: true, position: true },
  });
  const createdAt = new Map(created.map((row) => [row.position, row.id]));

  for (const { variantId, position } of plan.keep) {
    if (byId.get(variantId)?.position !== position) {
      await tx.productVariant.update({ where: { id: variantId }, data: { position } });
    }
  }

  const current = [
    ...plan.keep.map(({ variantId, valueIds }) => ({ variantId, valueIds })),
    ...plan.create.map(({ position, valueIds }) => ({ variantId: createdAt.get(position)!, valueIds })),
  ];
  await tx.productVariantValue.deleteMany({ where: { variantId: { in: plan.keep.map((kept) => kept.variantId) } } });
  await tx.productVariantValue.createMany({
    data: current.flatMap(({ variantId, valueIds }) =>
      valueIds.map((valueId, index) => ({ variantId, optionId: shapes[index]!.id, valueId })),
    ),
  });
}
