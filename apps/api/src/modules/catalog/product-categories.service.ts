// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { ProductCategory, PublicProductCategory } from '@harness-monorepo/contracts';
import type { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/product-category.dto.js';
import type { ReorderDto } from './dto/reorder.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { catalogError, CatalogSlugService } from './catalog-slug.service.js';
import {
  productCategoryAdminInclude,
  productCategoryInclude,
  toProductCategory,
  toPublicProductCategory,
} from './catalog.mapper.js';

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

  /**
   * The panel's list: every category, hidden ones included, in the order the shopkeeper chose, and
   * counting everything filed in them — drafts and sold-out rows alike. See
   * `productCategoryAdminInclude` for why this count is not the storefront's.
   */
  async list(storeSlug: string, userId: string): Promise<ProductCategory[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const rows = await this.prisma.productCategory.findMany({
      where: { storeId },
      include: productCategoryAdminInclude,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    return rows.map(toProductCategory);
  }

  /**
   * The storefront's list. Hidden categories are absent, and so are the ones holding nothing
   * published. A category whose shelf is merely empty stays: its count is zero, and its address
   * keeps answering.
   */
  /**
   * Every category a visitor may see, parents and children alike, with each parent's count rolled
   * up from the level below it.
   *
   * The ones with nothing published are dropped here rather than in the query, and that is the whole
   * reason this is not one `where`. A shop that files every whey under `Proteínas → Whey` has a `Proteínas` with
   * no products of its own: `products: { some: … }` would drop it, and the menu would lose the
   * heading while everything under it was still for sale. Only code holding the whole tree can
   * tell "empty" from "empty at this level".
   *
   * One query, because a shop's categories are tens of rows and the rollup is arithmetic.
   */
  async listPublic(storeId: string): Promise<PublicProductCategory[]> {
    const rows = await this.prisma.productCategory.findMany({
      where: { storeId, isActive: true },
      include: productCategoryInclude,
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    const categories = rows.map(toPublicProductCategory);
    const directById = new Map(rows.map((row) => [row.id, row._count.products]));

    // A child's products count for its parent as well. Two levels deep by construction, so this is
    // one pass and never a walk.
    for (const row of rows) {
      if (!row.parentId) continue;

      directById.set(row.parentId, (directById.get(row.parentId) ?? 0) + row._count.products);
    }

    // Published anywhere in this branch, rolled up the same way the count is. It is a second
    // signal and not the count itself, because the two answer different questions: the count says
    // what is on the shelf right now, and this says whether the category is a place at all. A
    // category whose last item sold out keeps its address — it is in somebody's Instagram bio, and
    // the sold-out product's page links to it twice — and shows an empty shelf rather than a 404.
    const publishedById = new Map(rows.map((row) => [row.id, row.products.length > 0]));

    for (const row of rows) {
      if (!row.parentId || row.products.length === 0) continue;

      publishedById.set(row.parentId, true);
    }

    return categories
      .map((category, index) => ({ ...category, productCount: directById.get(rows[index].id) ?? 0 }))
      .filter((_category, index) => publishedById.get(rows[index].id) === true);
  }

  /**
   * The parent a category may actually have: one in this shop, that is a top level itself, and is
   * not the category being edited.
   *
   * Two levels is the whole rule, and it is enforced here rather than in the schema because no
   * database constraint can say "this row's parent must have none" — a check would have to read
   * another row. What it protects is the URL: `/<shop>/<category>` is flat, so a grandchild has
   * nowhere to live that its grandparent does not already occupy.
   *
   * The `storeId` check matters as much as the depth one: without it a shopkeeper could file their
   * category under another shop's, which is a tenant boundary and not a taxonomy question.
   */
  private async parentFor(storeId: string, parentId: string, selfId?: string): Promise<string> {
    if (selfId && parentId === selfId) {
      throw new BadRequestException(catalogError('PRODUCT_CATEGORY_DEPTH', 'A category cannot be its own parent'));
    }

    const parent = await this.prisma.productCategory.findFirst({
      where: { id: parentId, storeId },
      select: { id: true, parentId: true },
    });

    if (!parent) {
      throw new NotFoundException(catalogError('PRODUCT_CATEGORY_NOT_FOUND', `No category at "${parentId}"`));
    }

    if (parent.parentId) {
      throw new BadRequestException(
        catalogError('PRODUCT_CATEGORY_DEPTH', 'Categories go two levels deep; this parent already has one'),
      );
    }

    return parent.id;
  }

  async create(storeSlug: string, userId: string, dto: CreateProductCategoryDto): Promise<ProductCategory> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const slug = this.slugs.resolve(dto.slug, dto.name);
    const parentId = dto.parentId ? await this.parentFor(storeId, dto.parentId) : null;

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
          parentId,
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

    // Checked before the write, and with `categoryId` in hand: a category made its own parent is a
    // row Postgres accepts happily and every read of the tree then walks in circles.
    const parentId = dto.parentId ? await this.parentFor(storeId, dto.parentId, categoryId) : null;

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
          ...(dto.parentId !== undefined ? { parentId } : {}),
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
