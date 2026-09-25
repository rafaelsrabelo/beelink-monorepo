// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { CreateRestockRequestDto } from './dto/restock-request.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { catalogError } from './catalog-slug.service.js';

/**
 * The storefront's "Avise-me": a visitor leaves a number for a sold-out combination.
 *
 * Only a combination the shop sells, of a product it has published, can be asked about — the same
 * rows a visitor can see on the product page. A request for anything else says so, with one code
 * for every reason, so the answer does not tell a stranger which ids exist in which shop.
 */
@Injectable()
export class RestockRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async receive(storeSlug: string, productId: string, dto: CreateRestockRequestDto): Promise<void> {
    const storeId = await this.stores.publicStoreId(storeSlug);

    // The trap, sprung: answered exactly like a save, and nothing is written.
    if (dto.website) return;

    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: dto.variantId,
        productId,
        storeId,
        isActive: true,
        archivedAt: null,
        product: { status: 'ACTIVE' },
      },
      select: { id: true },
    });

    if (!variant) {
      throw new BadRequestException(
        catalogError('RESTOCK_VARIANT_INVALID', 'This shop does not sell that combination'),
      );
    }

    // Asking twice is one person waiting; the second request keeps the first and its date.
    await this.prisma.restockRequest.createMany({
      data: [{ storeId, productId, variantId: variant.id, phone: dto.phone, name: dto.name ?? null }],
      skipDuplicates: true,
    });
  }
}
