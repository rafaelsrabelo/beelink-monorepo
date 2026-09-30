// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CustomerFavoriteIds, CustomerFavoritePage, FavoriteErrorCode } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { lockCustomer } from '../customers/customer-lock.js';
import { CustomersService } from '../customers/customers.service.js';
import type { LikeFavoriteDto, ListCustomerFavoritesDto } from './dto/favorite.dto.js';
import { SELLING_VARIANTS, favoriteInclude, pageOf, toCustomerFavorite, wholeProductPriceOf } from './favorite-reading.js';
import { FAVORITES_MAX, FAVORITES_PAGE_SIZE } from './favorites.constants.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function favoriteError(errorCode: FavoriteErrorCode, message: string): { errorCode: FavoriteErrorCode; message: string } {
  return { errorCode, message };
}

/** What the shop window shows: a draft is its owner's alone, and leaves every favourite list. */
const PUBLISHED = { product: { status: 'ACTIVE' } } as const;

/**
 * The shopper's favourites at a shop (BEELINK-153). A favourite keeps what it cost when it was
 * liked, so the list can say it got cheaper; see `favorite-reading.ts` for how one is priced now.
 */
@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  async list(storeSlug: string, userId: string, query: ListCustomerFavoritesDto): Promise<CustomerFavoritePage> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);
    // Bounded by FAVORITES_MAX, so the filters, their counts and the orders are one read and arithmetic.
    const rows = await this.prisma.customerFavorite.findMany({ where: { customerId, ...PUBLISHED }, include: favoriteInclude });

    return pageOf(rows.map(toCustomerFavorite), {
      ...(query.filter ? { filter: query.filter } : {}),
      sort: query.sort ?? 'RECENT',
      page: query.page ?? 1,
      pageSize: query.pageSize ?? FAVORITES_PAGE_SIZE,
    });
  }

  async ids(storeSlug: string, userId: string): Promise<CustomerFavoriteIds> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);
    const rows = await this.prisma.customerFavorite.findMany({
      where: { customerId, ...PUBLISHED },
      select: { productId: true },
      orderBy: { likedAt: 'desc' },
    });
    return { productIds: rows.map((row) => row.productId) };
  }

  /**
   * Liked at today's price. The same thing liked again keeps its price and date — they are what "it
   * got cheaper" is measured against; another combination of the product is a new like.
   */
  async like(storeSlug: string, userId: string, productId: string, dto: LikeFavoriteDto): Promise<void> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const variantId = dto.variantId?.toLowerCase() ?? null;

    // A draft, another shop's or no such product: one answer, so it tells nobody which ids exist where.
    const product = UUID.test(productId)
      ? await this.prisma.product.findFirst({
          where: { id: productId.toLowerCase(), storeId, status: 'ACTIVE' },
          select: { id: true, priceCents: true, compareAtPriceCents: true, variants: SELLING_VARIANTS },
        })
      : null;
    if (!product) throw new NotFoundException(favoriteError('CUSTOMER_FAVORITE_PRODUCT_NOT_FOUND', 'No such product on sale in this shop'));

    const variant = variantId
      ? await this.prisma.productVariant.findFirst({ where: { id: variantId, productId: product.id, isActive: true, archivedAt: null }, select: { priceCents: true } })
      : null;
    if (variantId && !variant) throw new NotFoundException(favoriteError('CUSTOMER_FAVORITE_VARIANT_NOT_FOUND', 'This product does not sell that combination'));

    await this.prisma.$transaction(async (tx) => {
      // Under the record's lock, so two likes at once cannot both pass the cap.
      await lockCustomer(tx, customerId);
      const current = await tx.customerFavorite.findUnique({ where: { customerId_productId: { customerId, productId: product.id } }, select: { id: true, variantId: true } });
      if (current?.variantId === variantId) return;

      const liked = { variantId, likedPriceCents: (variant ?? wholeProductPriceOf(product)).priceCents, likedAt: new Date() };
      if (current) {
        await tx.customerFavorite.update({ where: { id: current.id }, data: liked });
        return;
      }

      if ((await tx.customerFavorite.count({ where: { customerId } })) >= FAVORITES_MAX) {
        throw new ConflictException(favoriteError('CUSTOMER_FAVORITE_LIMIT', `A customer keeps at most ${FAVORITES_MAX} favourites`));
      }
      await tx.customerFavorite.create({ data: { customerId, productId: product.id, ...liked } });
    });
  }

  /** Gone, or never there: the same answer, so a double tap never errs. */
  async unlike(storeSlug: string, userId: string, productId: string): Promise<void> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);
    if (!UUID.test(productId)) return;
    await this.prisma.customerFavorite.deleteMany({ where: { customerId, productId: productId.toLowerCase() } });
  }
}
