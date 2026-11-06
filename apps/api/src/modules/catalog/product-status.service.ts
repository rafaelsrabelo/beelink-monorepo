// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { ProductStatusResult } from '@harness-monorepo/contracts';
import type { ProductStatusDto } from './dto/product-status.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { watchFavorites } from '../favorites/favorite-watch.js';
import { catalogError } from './catalog-slug.service.js';
import { lockProduct } from './variant-cache.js';

/**
 * Several products put in one status at once, for the list's bulk action.
 *
 * Its own service because the product service already runs past the line limit. It owes what a
 * single product's save owes when its status changes, and nothing else: a draft published is
 * looked at again for its favourites (BEELINK-155), under its row's lock, as
 * `ProductsService.update` does it.
 */
@Injectable()
export class ProductStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async setStatus(storeSlug: string, userId: string, dto: ProductStatusDto): Promise<ProductStatusResult> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { storeId, id: { in: dto.ids } },
        select: { id: true, status: true },
      });
      if (products.length !== dto.ids.length) {
        throw new NotFoundException(catalogError('PRODUCT_NOT_FOUND', 'One of these products is not in this shop'));
      }

      const moving = products.filter((product) => product.status !== dto.status).map((product) => product.id);
      if (moving.length === 0) return { changed: 0 };

      await tx.product.updateMany({ where: { id: { in: moving } }, data: { status: dto.status } });

      if (dto.status === 'ACTIVE') {
        for (const productId of moving) {
          await lockProduct(tx, productId);
          await watchFavorites(tx, productId);
        }
      }

      return { changed: moving.length };
    });
  }
}
