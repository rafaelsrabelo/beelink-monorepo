// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type {
  Product,
  ProductDetail,
  ProductListQuery,
  ProductPage,
  ProductStockFilter,
  PublicProduct,
  PublicProductCard,
} from '@harness-monorepo/contracts';
import type { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import type { ReorderDto } from './dto/reorder.dto.js';
import type { ProductWhereInput } from '../../generated/prisma/models/Product.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { catalogError, CatalogSlugService } from './catalog-slug.service.js';
import { ON_THE_SHELF_WHERE } from './catalog.visibility.js';
import {
  PRODUCTS_ADMIN_PAGE_SIZE,
  PRODUCTS_PAGE_SIZE,
  PRODUCTS_PAGE_SIZE_MAX,
} from './catalog.constants.js';
import { productInclude, toProduct, toPublicProduct, toPublicProductCard } from './catalog.mapper.js';
import { assertParcel, assertPrices, skuTaken, uniqueViolationOn } from './product-rules.js';
import { lockProduct, perUnitPatchOf, syncProductCache } from './variant-cache.js';
import { productDetailInclude, toProductDetail } from './variant.mapper.js';

/** The rows a write should store for a product's photos, in the order they were sent. */
function imageRows(images: CreateProductDto['images']): { url: string; alt: string | null; position: number }[] {
  return (images ?? []).map((image, position) => ({
    url: image.url,
    alt: image.alt ?? null,
    position,
  }));
}

/**
 * The three answers to "how many are left", as a `where` fragment.
 *
 * `UNTRACKED` is a shop that does not count this product — made to order — and is not a stock of
 * zero. `OUT_OF_STOCK` also catches a null quantity on a counted product, which is a shopkeeper who
 * turned counting on and has not said how many: from the shelf, that is none.
 */
function stockFilter(stock: ProductStockFilter | undefined): ProductWhereInput | null {
  if (stock === 'UNTRACKED') return { trackStock: false };
  if (stock === 'IN_STOCK') return { trackStock: true, stockQuantity: { gt: 0 } };
  if (stock === 'OUT_OF_STOCK') {
    return { trackStock: true, OR: [{ stockQuantity: { lte: 0 } }, { stockQuantity: null }] };
  }
  return null;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly slugs: CatalogSlugService,
  ) {}

  /**
   * The panel's list: one page of it, drafts included, in the order the shopkeeper chose.
   *
   * Drafts are here and marked rather than hidden. This is the screen where one is published, so
   * leaving it out would make that impossible — and the storefront's list is a different method
   * for exactly that reason.
   *
   * The filters run here and not in the browser because a shop with three hundred products would
   * otherwise ship all three hundred to draw twenty. `total` counts the filter and not the page,
   * because that is what the pager divides, and the count runs over the same `where` inside one
   * transaction: read separately, the two could fall either side of a write and disagree.
   */
  async list(storeSlug: string, userId: string, query: ProductListQuery = {}): Promise<ProductPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const search = query.search?.trim();
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? PRODUCTS_ADMIN_PAGE_SIZE, 1), PRODUCTS_PAGE_SIZE_MAX);

    // The two fragments that carry an `OR` — the stock filter and the search — are held in `AND`
    // rather than spread into one object. Spread, the second `OR` would overwrite the first, and
    // "out of stock" plus a search term would quietly answer the search alone.
    const stock = stockFilter(query.stock);
    const where = {
      storeId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.origin ? { origin: query.origin } : {}),
      AND: [
        ...(stock ? [stock] : []),
        // The name, the code and the barcode. A shopkeeper looking for one row types whichever of
        // the three they have in front of them, and a box that only matches the name is a box that
        // fails the person holding the product.
        ...(search
          ? [
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { sku: { contains: search, mode: 'insensitive' as const } },
                  { barcode: { contains: search, mode: 'insensitive' as const } },
                  // Every variant's code, not only the one the product's cache repeats.
                  {
                    variants: {
                      some: {
                        archivedAt: null,
                        OR: [
                          { sku: { contains: search, mode: 'insensitive' as const } },
                          { barcode: { contains: search, mode: 'insensitive' as const } },
                        ],
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
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

    return { products: rows.map(toProduct), total, page, pageSize };
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

    // Both the shelf rule and the search carry an `OR`, so they are held in `AND` rather than
    // spread into one object — spread, the second would overwrite the first and the filtered
    // search would quietly answer the search alone. See catalog.visibility.ts.
    const where = {
      storeId,
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
      AND: [
        ON_THE_SHELF_WHERE,
        // Name and description both, because a shop selling "Bolsa Amora" describes it as crochet
        // and someone searching "crochê" means to find it.
        ...(search
          ? [
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' as const } },
                  { description: { contains: search, mode: 'insensitive' as const } },
                ],
              },
            ]
          : []),
      ],
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
    // Status only, on purpose — a sold-out product still has a page. This is the address that goes
    // out on WhatsApp, and the schema's note on `slugHistory` calls a 404 here the most visible
    // failure this product can produce. The answer carries `soldOut`, and the page drops the way to
    // order rather than the page itself. The grid and the category counts do exclude it; see
    // catalog.visibility.ts.
    const row = await this.prisma.product.findFirst({
      where: { storeId, slug, status: 'ACTIVE' },
      include: productInclude,
    });

    if (!row) throw new NotFoundException(catalogError('PRODUCT_NOT_FOUND', `No product at "${slug}"`));

    return toPublicProduct(row);
  }

  async byId(storeSlug: string, productId: string, userId: string): Promise<ProductDetail> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const row = await this.prisma.product.findFirst({
      where: { id: productId, storeId },
      include: productDetailInclude,
    });

    if (!row) throw this.notFound(productId);

    return toProductDetail(row);
  }

  async create(storeSlug: string, userId: string, dto: CreateProductDto): Promise<ProductDetail> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const slug = this.slugs.resolve(dto.slug, dto.name);

    assertPrices(dto.priceCents, dto.compareAtPriceCents ?? null);
    assertParcel(dto.lengthMm ?? null, dto.widthMm ?? null, dto.heightMm ?? null);
    if (dto.categoryId) await this.assertCategoryOwned(storeId, dto.categoryId);

    const last = await this.prisma.product.aggregate({ where: { storeId }, _max: { position: true } });

    // A new product has no options, so it sells one thing: its default variant, which holds the
    // per-unit values. The product's own columns get the same values, which is what the cache of a
    // single variant is.
    const perUnit = {
      priceCents: dto.priceCents,
      compareAtPriceCents: dto.compareAtPriceCents ?? null,
      costCents: dto.costCents ?? null,
      sku: dto.sku ?? null,
      barcode: dto.barcode ?? null,
      trackStock: dto.trackStock ?? false,
      stockQuantity: dto.stockQuantity ?? null,
      weightGrams: dto.weightGrams ?? null,
      lengthMm: dto.lengthMm ?? null,
      widthMm: dto.widthMm ?? null,
      heightMm: dto.heightMm ?? null,
    };

    try {
      const row = await this.prisma.product.create({
        data: {
          storeId,
          slug,
          name: dto.name,
          description: dto.description ?? null,
          categoryId: dto.categoryId ?? null,
          status: dto.status ?? 'ACTIVE',
          origin: dto.origin ?? null,
          ...perUnit,
          position: (last._max.position ?? -1) + 1,
          images: { create: imageRows(dto.images) },
          variants: { create: [{ storeId, position: 0, ...perUnit }] },
        },
        include: productDetailInclude,
      });

      return toProductDetail(row);
    } catch (error) {
      throw this.conflictOf(error, slug);
    }
  }

  async update(
    storeSlug: string,
    productId: string,
    userId: string,
    dto: UpdateProductDto,
  ): Promise<ProductDetail> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.owned(storeId, productId);
    if (dto.categoryId) await this.assertCategoryOwned(storeId, dto.categoryId);

    const renaming = dto.slug !== undefined || dto.name !== undefined;
    let slug = dto.slug ?? '';

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await lockProduct(tx, productId);
        // Read again under the lock: the checks and the rename are judged against the row as it is
        // now, not as it was before another save of the same product finished.
        const current = await tx.product.findUniqueOrThrow({ where: { id: productId } });
        const perUnit = perUnitPatchOf(dto, current);

        // First, so a product with options answers why before any price rule does. A product with
        // options prices and counts each combination on its own; one price sent for the whole
        // product would be a claim about every variant that no variant made.
        if (Object.keys(perUnit).length > 0 && (await tx.productOption.count({ where: { productId } })) > 0) {
          throw new ConflictException(
            catalogError('PRODUCT_HAS_OPTIONS', 'This product has options: price and stock belong to its variants'),
          );
        }

        const after = { ...current, ...perUnit };
        assertPrices(after.priceCents, after.compareAtPriceCents);
        // Against what the row will hold after the patch, not against what was sent: sending one
        // side on a product that already has the other two is a complete box, and refusing it
        // would be a rule about the request rather than about the parcel.
        assertParcel(after.lengthMm, after.widthMm, after.heightMm);

        slug = renaming ? this.slugs.resolve(dto.slug, dto.name ?? current.name) : current.slug;

        await tx.product.update({
          where: { id: productId },
          data: {
            ...(renaming
              ? {
                  slug,
                  slugHistory: this.slugs.historyAfterRename(current.slug, slug, current.slugHistory),
                  name: dto.name ?? current.name,
                }
              : {}),
            ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
            ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId ?? null } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.origin !== undefined ? { origin: dto.origin } : {}),
            // Images are replaced whole when the key is sent: the panel's gallery reports the list
            // it now holds, including the order, and reconciling that row by row would be a diff
            // the client already computed. Omitting the key leaves the photos alone.
            ...(dto.images !== undefined
              ? { images: { deleteMany: {}, create: imageRows(dto.images) } }
              : {}),
          },
        });

        if (Object.keys(perUnit).length > 0) {
          // Without options, the product's one variant is its default, and it takes the values.
          await tx.productVariant.updateMany({ where: { productId, archivedAt: null }, data: perUnit });
          await syncProductCache(tx, productId);
        }

        return tx.product.findUniqueOrThrow({ where: { id: productId }, include: productDetailInclude });
      });

      return toProductDetail(row);
    } catch (error) {
      throw this.conflictOf(error, slug);
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

    // Its own read rather than `list`, which is paged now: reorder already demands every product
    // of the shop in the body, so answering with a page of them would be answering with less than
    // was sent.
    const rows = await this.prisma.product.findMany({
      where: { storeId },
      include: productInclude,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    return rows.map(toProduct);
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

    if (!row) throw this.notFound(productId);

    return row;
  }

  private notFound(productId: string): NotFoundException {
    return new NotFoundException(catalogError('PRODUCT_NOT_FOUND', `No product ${productId} in this shop`));
  }

  /** A refused unique index as the conflict it means, or the error as it came. */
  private conflictOf(error: unknown, slug: string): unknown {
    const model = uniqueViolationOn(error);

    if (model === 'ProductVariant') return skuTaken();
    if (model === 'Product') {
      return new ConflictException(
        catalogError('PRODUCT_SLUG_TAKEN', `This shop already has a product at "${slug}"`),
      );
    }

    return error;
  }
}
