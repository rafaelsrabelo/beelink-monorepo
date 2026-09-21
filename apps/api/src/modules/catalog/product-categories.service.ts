// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { ProductCategory, PublicProductCategory } from '@harness-monorepo/contracts';
import type { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/product-category.dto.js';
import type { ReorderDto } from './dto/reorder.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { catalogError, CatalogSlugService } from './catalog-slug.service.js';
import { productCategoryInclude, toProductCategory, toPublicProductCategory } from './catalog.mapper.js';

/** Postgres' unique violation, as Prisma reports it — the backstop for the race a pre-check loses. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly slugs: CatalogSlugService,
  ) {}

  /** The panel's list: every category, hidden ones included, in the order the shopkeeper chose. */
  async list(storeSlug: string, userId: string): Promise<ProductCategory[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const rows = await this.prisma.productCategory.findMany({
      where: { storeId },
      include: productCategoryInclude,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    return rows.map(toProductCategory);
  }

  /**
   * The storefront's list. Hidden categories are absent, and so are empty ones: a shop window that
   * offers a category and then shows nothing behind it reads as broken rather than as new.
   */
  async listPublic(storeId: string): Promise<PublicProductCategory[]> {
    const rows = await this.prisma.productCategory.findMany({
      where: { storeId, isActive: true, products: { some: { isAvailable: true } } },
      include: productCategoryInclude,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    return rows.map(toPublicProductCategory);
  }

  async create(storeSlug: string, userId: string, dto: CreateProductCategoryDto): Promise<ProductCategory> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const slug = this.slugs.resolve(dto.slug, dto.name);

    // New rows go last, which is where a shopkeeper looks for what they just added. Ordering is
    // per shop, so the aggregate is scoped rather than global.
    const last = await this.prisma.productCategory.aggregate({
      where: { storeId },
      _max: { position: true },
    });

    try {
      const row = await this.prisma.productCategory.create({
        data: {
          storeId,
          slug,
          name: dto.name,
          description: dto.description ?? null,
          imageUrl: dto.imageUrl ?? null,
          isActive: dto.isActive ?? true,
          position: (last._max.position ?? -1) + 1,
        },
        include: productCategoryInclude,
      });

      return toProductCategory(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw this.taken(slug);
      throw error;
    }
  }

  /**
   * A patch, not a replacement, unlike a shop's update: the panel edits one category in a dialog
   * with four fields, and a key it leaves out is a key the shopkeeper did not open.
   */
  async update(
    storeSlug: string,
    categoryId: string,
    userId: string,
    dto: UpdateProductCategoryDto,
  ): Promise<ProductCategory> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.owned(storeId, categoryId);

    const renaming = dto.slug !== undefined || dto.name !== undefined;
    const slug = renaming ? this.slugs.resolve(dto.slug, dto.name ?? current.name) : current.slug;

    try {
      const row = await this.prisma.productCategory.update({
        where: { id: categoryId },
        data: {
          slug,
          slugHistory: this.slugs.historyAfterRename(current.slug, slug, current.slugHistory),
          name: dto.name ?? current.name,
          // `?? null` rather than `?? current.x`: sending the key with null is how the panel clears
          // a field, and `undefined` is Prisma's own "leave this column alone".
          ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl ?? null } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: productCategoryInclude,
      });

      return toProductCategory(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw this.taken(slug);
      throw error;
    }
  }

  /**
   * The products survive: the relation is SetNull, so deleting a category un-files what was in it
   * rather than destroying a catalogue the shopkeeper spent an evening on.
   */
  async remove(storeSlug: string, categoryId: string, userId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.owned(storeId, categoryId);

    await this.prisma.productCategory.delete({ where: { id: categoryId } });
  }

  /**
   * One request for the whole list, not one per row: a drag that moves the third item to the top
   * changes every position below it, and sending those one at a time leaves the list in an order
   * nobody chose if the tab closes halfway. The transaction is what makes that true.
   */
  async reorder(storeSlug: string, userId: string, dto: ReorderDto): Promise<ProductCategory[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const owned = await this.prisma.productCategory.findMany({
      where: { storeId },
      select: { id: true },
    });

    // Refusing a partial list is the point: a body missing an id would silently leave that row at a
    // position another row now also holds, and the list would order differently on every read.
    const sent = new Set(dto.ids);
    if (sent.size !== dto.ids.length || sent.size !== owned.length || !owned.every((row) => sent.has(row.id))) {
      throw new ConflictException(
        catalogError(
          'CATALOG_REORDER_MISMATCH',
          'Send every category of this shop exactly once, in the new order',
        ),
      );
    }

    await this.prisma.$transaction(
      dto.ids.map((id, position) =>
        this.prisma.productCategory.update({ where: { id }, data: { position } }),
      ),
    );

    return this.list(storeSlug, userId);
  }

  /** A category of another shop answers 404, not 403: its id is not public, so its existence is not either. */
  private async owned(
    storeId: string,
    categoryId: string,
  ): Promise<{ name: string; slug: string; slugHistory: string[] }> {
    const row = await this.prisma.productCategory.findFirst({
      where: { id: categoryId, storeId },
      select: { name: true, slug: true, slugHistory: true },
    });

    if (!row) {
      throw new NotFoundException(
        catalogError('PRODUCT_CATEGORY_NOT_FOUND', `No category ${categoryId} in this shop`),
      );
    }

    return row;
  }

  private taken(slug: string): ConflictException {
    return new ConflictException(
      catalogError('PRODUCT_CATEGORY_SLUG_TAKEN', `This shop already has a category at "${slug}"`),
    );
  }
}
