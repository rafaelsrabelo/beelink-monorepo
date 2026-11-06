// Nest
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
  UnprocessableEntityException,
} from '@nestjs/common';

// Types
import type { ProductImportExtraction, ProductImportResult } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ProductImportDto, ProductImportItemDto } from './dto/product-import.dto.js';
import type { ImportFile } from './product-import.reader.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { slugify } from '../../shared/slug.js';
import { StoresService } from '../stores/stores.service.js';
import { catalogError } from './catalog-slug.service.js';
import { CATEGORY_SLUG_MAX_LENGTH, PRODUCT_SLUG_MAX_LENGTH, RESERVED_PATH_SEGMENTS } from './catalog.constants.js';
import { PRODUCT_IMPORT_TRANSACTION_MS, productImportError } from './product-import.constants.js';
import { ProductImportReader } from './product-import.reader.js';
import { categoryKeyOf, createImportedProduct, freeSlug } from './product-import.writes.js';
import { uniqueViolationOn } from './product-rules.js';
import { refuseDuplicateOptions } from './variant-rules.js';

type Db = Prisma.TransactionClient;

/**
 * A shop's products read from its menu, and then created — the two steps the contract describes.
 *
 * Its own service, beside the product service rather than inside it: that one already runs past the
 * line limit, and this one owns a different question — what a document says — that the product
 * service never asks. What it writes, it writes with the catalogue's own functions.
 */
@Injectable()
export class ProductImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly reader: ProductImportReader,
  ) {}

  /** Answered before the body is read: there is no reason to take ten megabytes nowhere can read. */
  assertConfigured(): void {
    if (!this.reader.configured()) {
      throw new NotImplementedException(
        productImportError('PRODUCT_IMPORT_NOT_CONFIGURED', 'No reader is configured for product imports'),
      );
    }
  }

  /** Drafts, and nothing written. The shop's category names go along so the reader reuses them. */
  async extract(storeSlug: string, userId: string, file: ImportFile): Promise<ProductImportExtraction> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const categories = await this.prisma.productCategory.findMany({
      where: { storeId },
      select: { name: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });

    const outcome = await this.reader.read(file, categories.map((category) => category.name));

    switch (outcome.status) {
      case 'read':
        return { drafts: outcome.drafts };
      case 'unreadable':
        throw new UnprocessableEntityException(
          productImportError('PRODUCT_IMPORT_UNREADABLE', 'Nothing in that document could be read as a product'),
        );
      case 'unavailable':
        // 502 and not 500, for the reason the uploads controller gives: this API is fine and so is
        // the document — the service it depends on did not answer.
        throw new BadGatewayException(productImportError('PRODUCT_IMPORT_UNAVAILABLE', 'The reader did not answer'));
    }
  }

  /**
   * Everything the shopkeeper confirmed, created as drafts in one transaction: if one product is
   * refused, none is created, so trying again after a failure never leaves half a menu behind.
   */
  async commit(storeSlug: string, userId: string, dto: ProductImportDto): Promise<ProductImportResult> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    for (const item of dto.products) {
      if (item.option) refuseDuplicateOptions({ options: [item.option] });
      if (slugify(item.name) === '') {
        throw new BadRequestException(catalogError('CATALOG_SLUG_EMPTY', `"${item.name}" leaves nothing that can be part of a web address`));
      }
    }
    await this.assertCategoriesOwned(storeId, dto.products);

    try {
      return await this.prisma.$transaction((tx) => this.write(tx, storeId, dto.products), {
        timeout: PRODUCT_IMPORT_TRANSACTION_MS,
      });
    } catch (error) {
      // Another write of the same shop took a segment between the read of the taken ones and this.
      const model = uniqueViolationOn(error);
      if (model === 'Product') throw new ConflictException(catalogError('PRODUCT_SLUG_TAKEN', 'A product took one of these addresses meanwhile'));
      if (model === 'ProductCategory') {
        throw new ConflictException(catalogError('PRODUCT_CATEGORY_SLUG_TAKEN', 'A category took one of these addresses meanwhile'));
      }
      throw error;
    }
  }

  private async write(tx: Db, storeId: string, items: readonly ProductImportItemDto[]): Promise<ProductImportResult> {
    const resolveCategory = await this.categoryResolver(tx, storeId);

    const reserved = new Set(RESERVED_PATH_SEGMENTS);
    const takenSlugs = new Set([
      ...reserved,
      ...(await tx.product.findMany({ where: { storeId }, select: { slug: true } })).map((row) => row.slug),
    ]);
    const last = await tx.product.aggregate({ where: { storeId }, _max: { position: true } });
    const firstPosition = (last._max.position ?? -1) + 1;

    const productIds: string[] = [];
    for (const [index, item] of items.entries()) {
      const slug = freeSlug(slugify(item.name), takenSlugs, PRODUCT_SLUG_MAX_LENGTH);
      takenSlugs.add(slug);

      const categoryId = await resolveCategory(item);
      productIds.push(await createImportedProduct(tx, item, { storeId, slug, categoryId, position: firstPosition + index }));
    }

    return { productIds, categoriesCreated: resolveCategory.created() };
  }

  /**
   * An item's category: the one it names by id, the shop's own one under the name it brought, or a
   * new one — made once per name, however many items share it, and placed after the shop's others.
   */
  private async categoryResolver(tx: Db, storeId: string) {
    const existing = await tx.productCategory.findMany({ where: { storeId }, select: { id: true, name: true, slug: true } });
    const byKey = new Map(existing.map((category) => [categoryKeyOf(category.name), category.id]));
    const takenSlugs = new Set([...RESERVED_PATH_SEGMENTS, ...existing.map((category) => category.slug)]);
    const last = await tx.productCategory.aggregate({ where: { storeId }, _max: { position: true } });
    let position = (last._max.position ?? -1) + 1;
    let created = 0;

    const resolve = async (item: ProductImportItemDto): Promise<string | null> => {
      if (item.categoryId) return item.categoryId;

      const name = item.newCategoryName?.trim();
      const key = name ? categoryKeyOf(name) : '';
      if (!name || key === '') return null;

      const known = byKey.get(key);
      if (known) return known;

      const slug = freeSlug(key, takenSlugs, CATEGORY_SLUG_MAX_LENGTH);
      takenSlugs.add(slug);
      const category = await tx.productCategory.create({ data: { storeId, slug, name, position }, select: { id: true } });
      position += 1;
      created += 1;
      byKey.set(key, category.id);

      return category.id;
    };

    return Object.assign(resolve, { created: () => created });
  }

  private async assertCategoriesOwned(storeId: string, items: readonly ProductImportItemDto[]): Promise<void> {
    const ids = [...new Set(items.flatMap((item) => (item.categoryId ? [item.categoryId] : [])))];
    if (ids.length === 0) return;

    const found = await this.prisma.productCategory.count({ where: { storeId, id: { in: ids } } });
    if (found !== ids.length) {
      throw new NotFoundException(catalogError('PRODUCT_CATEGORY_NOT_FOUND', 'One of these categories is not in this shop'));
    }
  }
}
