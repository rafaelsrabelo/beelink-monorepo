// Nest
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { ProductDetail } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ReplaceProductOptionsDto } from './dto/product-options.dto.js';
import type { UpdateProductVariantsDto } from './dto/product-variants.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { catalogError } from './catalog-slug.service.js';
import { PRODUCT_VARIANTS_MAX } from './catalog.constants.js';
import { assertParcel, assertPrices, skuTaken, uniqueViolationOn } from './product-rules.js';
import { lockProduct, perUnitPatchOf, syncProductCache } from './variant-cache.js';
import { planVariants } from './variant-combinations.js';
import { refuseDuplicateOptions, refuseForeignIds, refuseTakenSkus } from './variant-rules.js';
import { applyPlan, writeOptions } from './variant-writes.js';
import { productDetailInclude, toProductDetail } from './variant.mapper.js';

type Db = Prisma.TransactionClient;

/**
 * A product's options and variants, written by the variations editor.
 *
 * Its own service because the product's already runs past the line limit, and because the seam
 * falls here: the product service writes a product and its default variant, and this one writes
 * everything a product with options has. Both keep the product's per-unit columns as a cache of the
 * variants, through `syncProductCache`, under the same row lock.
 */
@Injectable()
export class ProductVariantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** The options, whole and in order. See ReplaceProductOptionsPayload for what survives. */
  async replaceOptions(
    storeSlug: string,
    productId: string,
    userId: string,
    dto: ReplaceProductOptionsDto,
  ): Promise<ProductDetail> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    refuseDuplicateOptions(dto);

    const count = dto.options.reduce((combinations, option) => combinations * option.values.length, 1);
    if (count > PRODUCT_VARIANTS_MAX) {
      throw new BadRequestException(
        catalogError('PRODUCT_VARIANTS_LIMIT', `These options make ${count} combinations; the limit is ${PRODUCT_VARIANTS_MAX}`),
      );
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockOwned(tx, storeId, productId);

      const options = await tx.productOption.findMany({ where: { productId }, include: { values: true } });
      const variants = await tx.productVariant.findMany({
        where: { productId, archivedAt: null },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        include: { values: true },
      });

      refuseForeignIds(dto, options);
      const shapes = await writeOptions(tx, productId, dto, options);
      const plan = planVariants(
        shapes,
        variants.map((variant) => ({
          id: variant.id,
          isActive: variant.isActive,
          valueByOption: new Map(variant.values.map((value) => [value.optionId, value.valueId])),
        })),
      );
      await applyPlan(tx, storeId, productId, shapes, plan, variants);
      await syncProductCache(tx, productId);

      return tx.product.findUniqueOrThrow({ where: { id: productId }, include: productDetailInclude });
    });

    return toProductDetail(row);
  }

  /** Several variants' prices, stock, codes and switches in one save. Variants not listed are left alone. */
  async updateVariants(
    storeSlug: string,
    productId: string,
    userId: string,
    dto: UpdateProductVariantsDto,
  ): Promise<ProductDetail> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await this.lockOwned(tx, storeId, productId);

        const variants = await tx.productVariant.findMany({ where: { productId, archivedAt: null } });
        const byId = new Map(variants.map((variant) => [variant.id, variant]));

        const patches = dto.variants.map((sent) => {
          const current = byId.get(sent.id);
          if (!current) {
            throw new NotFoundException(
              catalogError('PRODUCT_VARIANT_NOT_FOUND', `No current variant ${sent.id} on this product`),
            );
          }

          const data = {
            ...perUnitPatchOf(sent, current),
            // Required on a variant, so a null is "not sent", as it is for the price.
            ...(typeof sent.isActive === 'boolean' ? { isActive: sent.isActive } : {}),
            ...(sent.imageUrl !== undefined ? { imageUrl: sent.imageUrl ?? null } : {}),
          };
          const after = { ...current, ...data };
          assertPrices(after.priceCents, after.compareAtPriceCents);
          assertParcel(after.lengthMm, after.widthMm, after.heightMm);

          return { current, data, after };
        });

        await refuseTakenSkus(tx, storeId, productId, variants, patches);

        // Codes that change are cleared first, so two variants trading codes never hold one at once.
        const recoded = patches.filter(({ data }) => data.sku !== undefined).map(({ current }) => current.id);
        if (recoded.length > 0) {
          await tx.productVariant.updateMany({ where: { id: { in: recoded } }, data: { sku: null } });
        }
        for (const { current, data } of patches) {
          if (Object.keys(data).length > 0) await tx.productVariant.update({ where: { id: current.id }, data });
        }

        await syncProductCache(tx, productId);

        return tx.product.findUniqueOrThrow({ where: { id: productId }, include: productDetailInclude });
      });

      return toProductDetail(row);
    } catch (error) {
      // Another product of the shop took the code between the check above and the write.
      if (uniqueViolationOn(error) === 'ProductVariant') throw skuTaken();
      throw error;
    }
  }

  private async lockOwned(tx: Db, storeId: string, productId: string): Promise<void> {
    const product = await tx.product.findFirst({ where: { id: productId, storeId }, select: { id: true } });
    if (!product) {
      throw new NotFoundException(catalogError('PRODUCT_NOT_FOUND', `No product ${productId} in this shop`));
    }

    await lockProduct(tx, productId);
  }
}
