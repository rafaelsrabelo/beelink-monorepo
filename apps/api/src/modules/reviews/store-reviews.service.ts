// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { PublicProductReviews, ReviewRating, StoreReview, StoreReviewPage } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { catalogError } from '../catalog/catalog-slug.service.js';
import { ratingOf } from '../catalog/product-rating.js';
import { StoresService } from '../stores/stores.service.js';
import type { PublicReviewListDto, SetReviewVisibilityDto, StoreReviewListDto } from './dto/review.dto.js';
import { countIn, countOut, lockReview } from './review-books.js';
import { reviewInclude, toPublicReview, toStoreReview } from './reviews.mapper.js';
import { PUBLIC_REVIEWS_PAGE_SIZE, REVIEW_RATINGS, reviewError, STORE_REVIEWS_PAGE_SIZE, UUID } from './reviews.constants.js';

const NEWEST: Prisma.ProductReviewOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];

/**
 * A shop's reviews as the shop window reads them — a product's published ones — and as its owner
 * reads and moderates them (BEELINK-156). Hiding and publishing move the product's cache.
 */
@Injectable()
export class StoreReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** One product's published reviews: the summary of all of them, and a page, the most recent first. */
  async publicPage(storeSlug: string, productId: string, query: PublicReviewListDto): Promise<PublicProductReviews> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    // A draft, another shop's or no such product answers as its page does.
    const product = UUID.test(productId) ? await this.prisma.product.findFirst({ where: { id: productId.toLowerCase(), storeId, status: 'ACTIVE' }, select: { id: true } }) : null;
    if (!product) throw new NotFoundException(catalogError('PRODUCT_NOT_FOUND', 'No such product on sale in this shop'));

    const published = { productId: product.id, hiddenAt: null };
    const groups = await this.prisma.productReview.groupBy({ by: ['rating'], where: published, _count: { _all: true } });
    const histogram = Object.fromEntries(REVIEW_RATINGS.map((rating) => [rating, groups.find((group) => group.rating === rating)?._count._all ?? 0])) as Record<ReviewRating, number>;
    const count = REVIEW_RATINGS.reduce((sum, rating) => sum + histogram[rating], 0);
    const sum = REVIEW_RATINGS.reduce((total, rating) => total + rating * histogram[rating], 0);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? PUBLIC_REVIEWS_PAGE_SIZE;
    const rows = await this.prisma.productReview.findMany({
      where: { ...published, ...(query.rating ? { rating: query.rating } : {}) },
      orderBy: NEWEST,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: reviewInclude,
    });

    return {
      summary: { average: ratingOf(count, sum)?.average ?? null, count, histogram },
      reviews: rows.map(toPublicReview),
      total: query.rating ? histogram[query.rating] : count,
      page,
      pageSize,
    } satisfies PublicProductReviews;
  }

  /** The shop's reviews, the most recent first, by rating, product and status; the counts ignore the status. */
  async list(storeSlug: string, userId: string, query: StoreReviewListDto): Promise<StoreReviewPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const base: Prisma.ProductReviewWhereInput = {
      storeId,
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.productId ? { productId: query.productId.toLowerCase() } : {}),
    };
    const where = query.status ? { ...base, hiddenAt: query.status === 'HIDDEN' ? { not: null } : null } : base;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? STORE_REVIEWS_PAGE_SIZE;

    const [rows, total, all, hidden] = await Promise.all([
      this.prisma.productReview.findMany({ where, orderBy: NEWEST, skip: (page - 1) * pageSize, take: pageSize, include: reviewInclude }),
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.count({ where: base }),
      this.prisma.productReview.count({ where: { ...base, hiddenAt: { not: null } } }),
    ]);
    return { reviews: rows.map(toStoreReview), total, page, pageSize, counts: { ALL: all, PUBLISHED: all - hidden, HIDDEN: hidden } } satisfies StoreReviewPage;
  }

  /** Hidden from the shop window, or published again; the same state asked again changes nothing. */
  async setVisibility(storeSlug: string, userId: string, reviewId: string, dto: SetReviewVisibilityDto): Promise<StoreReview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const missing = () => new NotFoundException(reviewError('REVIEW_NOT_FOUND', 'No such review in this shop'));
    if (!UUID.test(reviewId)) throw missing();

    const row = await this.prisma.$transaction(async (tx) => {
      await lockReview(tx, reviewId.toLowerCase());
      const current = await tx.productReview.findFirst({ where: { id: reviewId.toLowerCase(), storeId } });
      if (!current) throw missing();
      if (dto.hidden === (current.hiddenAt !== null)) return tx.productReview.findUniqueOrThrow({ where: { id: current.id }, include: reviewInclude });

      // `updatedAt` kept: it is the customer's last edit, and hiding is the shop's doing, not theirs.
      const updated = await tx.productReview.update({ where: { id: current.id }, data: { hiddenAt: dto.hidden ? new Date() : null, updatedAt: current.updatedAt }, include: reviewInclude });
      await (dto.hidden ? countOut : countIn)(tx, current.productId, current.rating);
      return updated;
    });
    return toStoreReview(row);
  }
}
