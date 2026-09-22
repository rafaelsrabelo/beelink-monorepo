// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { Banner, BannerErrorCode, BannerTarget } from '@harness-monorepo/contracts';
import type { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto.js';
import type { ReorderDto } from '../catalog/dto/reorder.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { bannerInclude, toBanner } from './banners.mapper.js';

/** Keeps every code this module answers inside the contract's union. */
function bannerError(errorCode: BannerErrorCode, message: string): { errorCode: BannerErrorCode; message: string } {
  return { errorCode, message };
}

/** The four columns that together say where a banner points. Written as a set, never one at a time. */
interface TargetColumns {
  target: BannerTarget;
  categoryId: string | null;
  productId: string | null;
  externalUrl: string | null;
}

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** The panel's list: hidden banners included, in the order the shopkeeper chose. */
  async list(storeSlug: string, userId: string): Promise<Banner[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const rows = await this.prisma.storeBanner.findMany({
      where: { storeId },
      include: bannerInclude,
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
    });

    return rows.map(toBanner);
  }

  async create(storeSlug: string, userId: string, dto: CreateBannerDto): Promise<Banner> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const target = await this.targetColumns(storeId, dto.target, dto);

    // Last, the way a new category lands last. A banner that inserted itself at the top would
    // rearrange a page the shopkeeper had already arranged.
    const last = await this.prisma.storeBanner.aggregate({ where: { storeId }, _max: { position: true } });

    const row = await this.prisma.storeBanner.create({
      data: {
        storeId,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        imageUrl: dto.imageUrl,
        layout: dto.layout,
        ...target,
        position: (last._max.position ?? -1) + 1,
        isActive: dto.isActive ?? true,
      },
      include: bannerInclude,
    });

    return toBanner(row);
  }

  /**
   * A patch: a key left out is a column left alone.
   *
   * The destination is the exception, and it moves as a set or not at all. Sending a
   * `categorySlug` without saying `target` would otherwise mean guessing whether the shopkeeper
   * meant to re-point the banner or had simply left a stale field in a form — and either guess can
   * produce a row the database refuses, because the four columns are constrained together.
   */
  async update(storeSlug: string, userId: string, bannerId: string, dto: UpdateBannerDto): Promise<Banner> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.owned(storeId, bannerId);

    const movesTarget =
      dto.categorySlug !== undefined || dto.productSlug !== undefined || dto.externalUrl !== undefined;

    if (movesTarget && dto.target === undefined) {
      throw new BadRequestException(
        bannerError('BANNER_TARGET_INVALID', 'Send `target` alongside the destination it names'),
      );
    }

    const target = dto.target === undefined ? null : await this.targetColumns(storeId, dto.target, dto);

    const row = await this.prisma.storeBanner.update({
      where: { id: bannerId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle ?? null } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.layout !== undefined ? { layout: dto.layout } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        // Spreading null adds nothing, so the four destination columns are simply left alone.
        ...target,
      },
      include: bannerInclude,
    });

    return toBanner(row);
  }

  async remove(storeSlug: string, userId: string, bannerId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.owned(storeId, bannerId);

    await this.prisma.storeBanner.delete({ where: { id: bannerId } });
  }

  /**
   * The whole list, in the new order, or nothing.
   *
   * Copied in shape from the catalogue's reorder, and for the same reason: a partial list is a list
   * whose missing rows keep positions that now collide, and the page they draw is neither the old
   * order nor the new one.
   */
  async reorder(storeSlug: string, userId: string, dto: ReorderDto): Promise<Banner[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const owned = await this.prisma.storeBanner.findMany({ where: { storeId }, select: { id: true } });

    const sent = new Set(dto.ids);
    if (sent.size !== dto.ids.length || sent.size !== owned.length || !owned.every((row) => sent.has(row.id))) {
      throw new ConflictException(
        bannerError('BANNER_REORDER_MISMATCH', 'Send every banner of this shop exactly once, in the new order'),
      );
    }

    await this.prisma.$transaction(
      dto.ids.map((id, position) => this.prisma.storeBanner.update({ where: { id }, data: { position } })),
    );

    return this.list(storeSlug, userId);
  }

  /**
   * Turns what the wire says into what the columns hold, and refuses anything the database would.
   *
   * The `CHECK` in the migration is the backstop, not the message: it answers with a constraint
   * name nobody can act on. This is where a shopkeeper gets told that the category they picked is
   * not one of theirs — and it is also what stops a banner pointing at another shop's row, which
   * is the one failure here that is a leak rather than a mistake.
   */
  private async targetColumns(
    storeId: string,
    target: BannerTarget,
    dto: { categorySlug?: string | null; productSlug?: string | null; externalUrl?: string | null },
  ): Promise<TargetColumns> {
    // Nowhere to go is a destination too, and the only one with nothing to look up.
    if (target === 'NONE') return { target, categoryId: null, productId: null, externalUrl: null };

    if (target === 'CATEGORY') {
      if (!dto.categorySlug) {
        throw new BadRequestException(bannerError('BANNER_TARGET_INVALID', 'A category banner needs a category'));
      }

      const category = await this.prisma.productCategory.findUnique({
        where: { storeId_slug: { storeId, slug: dto.categorySlug } },
        select: { id: true },
      });

      if (!category) {
        throw new NotFoundException(
          bannerError('BANNER_TARGET_INVALID', `No category "${dto.categorySlug}" in this shop`),
        );
      }

      return { target, categoryId: category.id, productId: null, externalUrl: null };
    }

    if (target === 'PRODUCT') {
      if (!dto.productSlug) {
        throw new BadRequestException(bannerError('BANNER_TARGET_INVALID', 'A product banner needs a product'));
      }

      const product = await this.prisma.product.findUnique({
        where: { storeId_slug: { storeId, slug: dto.productSlug } },
        select: { id: true },
      });

      if (!product) {
        throw new NotFoundException(
          bannerError('BANNER_TARGET_INVALID', `No product "${dto.productSlug}" in this shop`),
        );
      }

      return { target, categoryId: null, productId: product.id, externalUrl: null };
    }

    if (!dto.externalUrl) {
      throw new BadRequestException(bannerError('BANNER_TARGET_INVALID', 'An external banner needs an address'));
    }

    return { target, categoryId: null, productId: null, externalUrl: dto.externalUrl };
  }

  /** A banner that exists but belongs to another shop answers 404: this shop does not have one. */
  private async owned(storeId: string, bannerId: string): Promise<void> {
    const row = await this.prisma.storeBanner.findUnique({ where: { id: bannerId }, select: { storeId: true } });

    if (!row || row.storeId !== storeId) {
      throw new NotFoundException(bannerError('BANNER_NOT_FOUND', `No banner ${bannerId} in this shop`));
    }
  }
}
