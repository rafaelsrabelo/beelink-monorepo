// Nest
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CustomerPendingReview, CustomerReview } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import type { CreateReviewDto, UpdateReviewDto } from './dto/review.dto.js';
import { countIn, lockReview, recount } from './review-books.js';
import { reviewInclude, toCustomerReview } from './reviews.mapper.js';
import { reviewError } from './reviews.constants.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A line the shop delivered to this customer, of a product still on its shelf: what earns a review. */
function deliveredTo(customerId: string) {
  return { productId: { not: null }, order: { customerId, status: 'DELIVERED' as const }, product: { status: 'ACTIVE' as const } };
}

/**
 * The shopper's own reviews at a shop (BEELINK-156): only of a product the shop delivered to them,
 * one per product, which they may edit. Written published; the product's cache counts it in.
 */
@Injectable()
export class CustomerReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  /** What they received and have not rated, each product once, by its latest delivery. */
  async pending(storeSlug: string, userId: string): Promise<CustomerPendingReview[]> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);
    const lines = await this.prisma.orderItem.findMany({
      where: { ...deliveredTo(customerId), product: { status: 'ACTIVE', reviews: { none: { customerId } } } },
      orderBy: [{ order: { placedAt: 'desc' } }, { position: 'asc' }],
      select: {
        productId: true,
        variantLabel: true,
        product: { select: { slug: true, name: true, images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 } } },
        order: { select: { number: true, placedAt: true, events: { where: { status: 'DELIVERED' }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } } } },
      },
    });

    const seen = new Set<string>();
    return lines.flatMap((line) => {
      if (!line.productId || !line.product || seen.has(line.productId)) return [];
      seen.add(line.productId);
      return [
        {
          productId: line.productId,
          slug: line.product.slug,
          name: line.product.name,
          imageUrl: line.product.images[0]?.url ?? null,
          variantLabel: line.variantLabel,
          orderNumber: line.order.number,
          deliveredAt: (line.order.events[0]?.createdAt ?? line.order.placedAt).toISOString(),
        } satisfies CustomerPendingReview,
      ];
    });
  }

  /** The reviews they wrote, the most recent first — hidden ones too, marked. */
  async list(storeSlug: string, userId: string): Promise<CustomerReview[]> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);
    const rows = await this.prisma.productReview.findMany({ where: { customerId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: reviewInclude });
    return rows.map(toCustomerReview);
  }

  async create(storeSlug: string, userId: string, dto: CreateReviewDto): Promise<CustomerReview> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    // The latest delivery of it names the combination bought. None, another shop's, a draft or no
    // such product: one answer, so it tells nobody which ids exist where.
    const bought = await this.prisma.orderItem.findFirst({
      where: { ...deliveredTo(customerId), productId: dto.productId.toLowerCase(), product: { storeId, status: 'ACTIVE' } },
      orderBy: [{ order: { placedAt: 'desc' } }, { position: 'asc' }],
      select: { productId: true, variantId: true, variantLabel: true, orderId: true },
    });
    if (!bought?.productId) throw new ForbiddenException(reviewError('CUSTOMER_REVIEW_NOT_ELIGIBLE', 'The shop never delivered this product to this customer'));
    const productId = bought.productId;

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.productReview.create({
          data: { storeId, productId, customerId, variantId: bought.variantId, variantLabel: bought.variantLabel, orderId: bought.orderId, rating: dto.rating, comment: dto.comment ?? null },
          include: reviewInclude,
        });
        await countIn(tx, productId, dto.rating);
        return created;
      });
      return toCustomerReview(row);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(reviewError('CUSTOMER_REVIEW_EXISTS', 'This customer already reviewed this product'));
      }
      throw error;
    }
  }

  /** Their words and rating again; a review the shop hid stays hidden. */
  async update(storeSlug: string, userId: string, reviewId: string, dto: UpdateReviewDto): Promise<CustomerReview> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);
    const missing = () => new NotFoundException(reviewError('CUSTOMER_REVIEW_NOT_FOUND', "No such review among this customer's"));
    if (!UUID.test(reviewId)) throw missing();

    const row = await this.prisma.$transaction(async (tx) => {
      await lockReview(tx, reviewId.toLowerCase());
      const current = await tx.productReview.findFirst({ where: { id: reviewId.toLowerCase(), customerId } });
      if (!current) throw missing();
      const updated = await tx.productReview.update({ where: { id: current.id }, data: { rating: dto.rating, comment: dto.comment ?? null }, include: reviewInclude });
      if (current.hiddenAt === null) await recount(tx, current.productId, current.rating, dto.rating);
      return updated;
    });
    return toCustomerReview(row);
  }
}
