// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { Product, PublicProduct, PublicProductCard } from '@harness-monorepo/contracts';
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import type { ReorderDto } from './dto/reorder.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { catalogError, CatalogSlugService } from './catalog-slug.service.js';
import { PRODUCTS_PAGE_SIZE } from './catalog.constants.js';
import { productInclude, toProduct, toPublicProduct, toPublicProductCard } from './catalog.mapper.js';

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

/** The rows a write should store for a product's photos, in the order they were sent. */
function imageRows(images: CreateProductDto['images']): { url: string; alt: string | null; position: number }[] {
  return (images ?? []).map((image, position) => ({
    url: image.url,
    alt: image.alt ?? null,
    position,
  }));
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly slugs: CatalogSlugService,
  ) {}

  /** The panel's list: unavailable products included, in the order the shopkeeper chose. */
  async list(storeSlug: string, userId: string): Promise<Product[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const rows = await this.prisma.product.findMany({
      where: { storeId },
      include: productInclude,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    return rows.map(toProduct);
  }

  /**
   * The storefront's list: one page of what a shop published, in the order the shopkeeper arranged it.
   *
   * Unavailable products are absent rather than greyed out — a window that shows what it will not
   * sell teaches a visitor to distrust the rest of it. The filters are here and not in the browser
   * because a shop with three hundred products would otherwise ship all three hundred to render
   * six, and because a search the server did is a search a crawler can follow.
   *
   * `total` counts the filter and not the page, because that is what the pager divides. The count
   * runs over the same `where` inside one transaction: read separately, the two could fall either
   * side of a write and disagree, and a pager that disagrees with its pages offers a last page that
   * is empty or hides one that is not.
   */
  async listPublic(
    storeId: string,
    filters: { category?: string; search?: string; page?: number; pageSize?: number } = {},
  ): Promise<{ products: PublicProductCard[]; total: number }> {
    const search = filters.search?.trim();
    const pageSize = filters.pageSize ?? PRODUCTS_PAGE_SIZE;
    const page = filters.page ?? 1;

    const where = {
      storeId,
      isAvailable: true,
      // A parent's shelf holds what is under it. Filtering `Proteínas` and getting nothing because
      // every whey is filed under `Proteínas → Whey` is the failure this avoids — and it is the one
      // a shopkeeper reports as "my category is empty" without ever mentioning subcategories.
      ...(filters.category
        ? {
            category: {
              isActive: true,
              OR: [{ slug: filters.category }, { parent: { slug: filters.category, isActive: true } }],
            },
          }
        : {}),
      // Name and description both, because a shop selling "Bolsa Amora" describes it as crochet
      // and someone searching "crochê" means to find it.
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products: rows.map(toPublicProductCard), total };
  }

  /**
   * One product, by the slug in its address. `slugHistory` is not consulted here: a renamed
   * product's old address is a redirect the web app owns, not a second name the API answers to.
   */
  async publicBySlug(storeId: string, slug: string): Promise<PublicProduct> {
    const row = await this.prisma.product.findFirst({
      where: { storeId, slug, isAvailable: true },
      include: productInclude,
    });

    if (!row) throw new NotFoundException(catalogError('PRODUCT_NOT_FOUND', `No product at "${slug}"`));

    return toPublicProduct(row);
  }

  async byId(storeSlug: string, productId: string, userId: string): Promise<Product> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    return toProduct(await this.owned(storeId, productId));
  }

  async create(storeSlug: string, userId: string, dto: CreateProductDto): Promise<Product> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const slug = this.slugs.resolve(dto.slug, dto.name);

    this.assertPrices(dto.priceCents, dto.compareAtPriceCents ?? null);
    if (dto.categoryId) await this.assertCategoryOwned(storeId, dto.categoryId);

    const last = await this.prisma.product.aggregate({ where: { storeId }, _max: { position: true } });

    try {
      const row = await this.prisma.product.create({
        data: {
          storeId,
          slug,
          name: dto.name,
          description: dto.description ?? null,
          priceCents: dto.priceCents,
          compareAtPriceCents: dto.compareAtPriceCents ?? null,
          categoryId: dto.categoryId ?? null,
          isAvailable: dto.isAvailable ?? true,
          position: (last._max.position ?? -1) + 1,
          images: { create: imageRows(dto.images) },
        },
        include: productInclude,
      });

      return toProduct(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw this.taken(slug);
      throw error;
    }
  }

  async update(
    storeSlug: string,
    productId: string,
    userId: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.owned(storeId, productId);

    const priceCents = dto.priceCents ?? current.priceCents;
    const compareAt =
      dto.compareAtPriceCents !== undefined ? dto.compareAtPriceCents : current.compareAtPriceCents;
    this.assertPrices(priceCents, compareAt ?? null);

    if (dto.categoryId) await this.assertCategoryOwned(storeId, dto.categoryId);

    const renaming = dto.slug !== undefined || dto.name !== undefined;
    const slug = renaming ? this.slugs.resolve(dto.slug, dto.name ?? current.name) : current.slug;

    try {
      const row = await this.prisma.product.update({
        where: { id: productId },
        data: {
          slug,
          slugHistory: this.slugs.historyAfterRename(current.slug, slug, current.slugHistory),
          name: dto.name ?? current.name,
          priceCents,
          ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
          ...(dto.compareAtPriceCents !== undefined ? { compareAtPriceCents: dto.compareAtPriceCents } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId ?? null } : {}),
          ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
          // Images are replaced whole when the key is sent: the panel's gallery reports the list it
          // now holds, including the order, and reconciling that row by row would be a diff the
          // client already computed. Omitting the key leaves the photos alone.
          ...(dto.images !== undefined
            ? { images: { deleteMany: {}, create: imageRows(dto.images) } }
            : {}),
        },
        include: productInclude,
      });

      return toProduct(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw this.taken(slug);
      throw error;
    }
  }

  async remove(storeSlug: string, productId: string, userId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.owned(storeId, productId);

    await this.prisma.product.delete({ where: { id: productId } });
  }

  async reorder(storeSlug: string, userId: string, dto: ReorderDto): Promise<Product[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const owned = await this.prisma.product.findMany({ where: { storeId }, select: { id: true } });

    const sent = new Set(dto.ids);
    if (sent.size !== dto.ids.length || sent.size !== owned.length || !owned.every((row) => sent.has(row.id))) {
      throw new ConflictException(
        catalogError('CATALOG_REORDER_MISMATCH', 'Send every product of this shop exactly once, in the new order'),
      );
    }

    await this.prisma.$transaction(
      dto.ids.map((id, position) => this.prisma.product.update({ where: { id }, data: { position } })),
    );

    return this.list(storeSlug, userId);
  }

  /**
   * A "was" price at or below the price is not a discount, it is a number that makes the storefront
   * render a negative percentage. Refused here rather than in the DTO because it is a rule about
   * two fields, and on update one of them may be the stored value rather than one that was sent.
   */
  private assertPrices(priceCents: number, compareAtPriceCents: number | null): void {
    if (compareAtPriceCents !== null && compareAtPriceCents <= priceCents) {
      throw new BadRequestException(
        catalogError(
          'CATALOG_PRICE_INVALID',
          'compareAtPriceCents must be above priceCents, or absent when there is no discount',
        ),
      );
    }
  }

  private async assertCategoryOwned(storeId: string, categoryId: string): Promise<void> {
    const row = await this.prisma.productCategory.findFirst({
      where: { id: categoryId, storeId },
      select: { id: true },
    });

    if (!row) {
      throw new NotFoundException(
        catalogError('PRODUCT_CATEGORY_NOT_FOUND', `No category ${categoryId} in this shop`),
      );
    }
  }

  private async owned(storeId: string, productId: string) {
    const row = await this.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: productInclude,
    });

    if (!row) {
      throw new NotFoundException(catalogError('PRODUCT_NOT_FOUND', `No product ${productId} in this shop`));
    }

    return row;
  }

  private taken(slug: string): ConflictException {
    return new ConflictException(
      catalogError('PRODUCT_SLUG_TAKEN', `This shop already has a product at "${slug}"`),
    );
  }
}
