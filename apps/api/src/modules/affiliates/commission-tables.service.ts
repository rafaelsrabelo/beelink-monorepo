// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CommissionCategoryRate, CommissionProductRate, CommissionTable } from '@harness-monorepo/contracts';
import type { CommissionTableModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { openProgram } from './affiliate-program.js';
import { COMMISSION_TABLES_MAX, UUID, affiliateError, isUniqueViolation } from './affiliates.constants.js';
import { toCommissionTable } from './affiliates.mapper.js';
import type { CommissionCategoryRateDto, CommissionProductRateDto, CommissionTableDto } from './dto/affiliate-program.dto.js';

const nameTaken = () => new ConflictException(affiliateError('COMMISSION_TABLE_NAME_TAKEN', 'Another table of this shop has that name'));

/**
 * A shop's commission tables (IMPULSEIA-101): a rate for every product, and a product's own where it
 * has one — `table.rates[product] ?? table.defaultRateBps`, and no other precedence. A change applies
 * to orders placed from then on.
 */
@Injectable()
export class CommissionTablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async create(storeSlug: string, userId: string, dto: CommissionTableDto): Promise<CommissionTable> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    // The default table comes first, so no other can take its name before it exists.
    await openProgram(this.prisma, storeId);

    // A guard against a runaway, not a rule of money: two creations at once may pass it by one.
    if ((await this.prisma.commissionTable.count({ where: { storeId } })) >= COMMISSION_TABLES_MAX) {
      throw new ConflictException(affiliateError('COMMISSION_TABLE_LIMIT', `A shop keeps at most ${COMMISSION_TABLES_MAX} tables`));
    }

    try {
      const row = await this.prisma.commissionTable.create({ data: { storeId, name: dto.name, defaultRateBps: dto.defaultRateBps } });
      return toCommissionTable({ ...row, rates: [], categoryRates: [] });
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  async read(storeSlug: string, userId: string, tableId: string): Promise<CommissionTable> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.tableWithRates(await this.tableOf(storeId, tableId));
  }

  async update(storeSlug: string, userId: string, tableId: string, dto: CommissionTableDto): Promise<CommissionTable> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const table = await this.tableOf(storeId, tableId);
    try {
      const row = await this.prisma.commissionTable.update({ where: { id: table.id }, data: { name: dto.name, defaultRateBps: dto.defaultRateBps } });
      return this.tableWithRates(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  /**
   * Gone for good: an order keeps the table's name and each line's rate, so no history leans on it.
   * Never while an affiliate who has not ended is on it (IMPULSEIA-103); the ended ones on it go to
   * the default table first, since their table pays nothing any more and the key may not dangle.
   */
  async remove(storeSlug: string, userId: string, tableId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const table = await this.tableOf(storeId, tableId);
    if (table.isDefault) throw new ConflictException(affiliateError('COMMISSION_TABLE_DEFAULT', 'The default table is never deleted'));

    await this.prisma.$transaction(async (tx) => {
      // The row held: an affiliate put on it meanwhile waits on the lock its key takes, and finds it gone.
      await tx.$queryRaw`SELECT 1 FROM "commission_tables" WHERE "id" = ${table.id}::uuid FOR UPDATE`;
      if ((await tx.affiliate.count({ where: { tableId: table.id, status: { not: 'ENDED' } } })) > 0) {
        throw new ConflictException(affiliateError('COMMISSION_TABLE_IN_USE', 'Affiliates who have not ended are on this table'));
      }
      const fallback = await tx.commissionTable.findFirstOrThrow({ where: { storeId, isDefault: true }, select: { id: true } });
      await tx.affiliate.updateMany({ where: { tableId: table.id }, data: { tableId: fallback.id } });
      await tx.commissionTable.deleteMany({ where: { id: table.id, isDefault: false } });
    });
  }

  async setRate(storeSlug: string, userId: string, tableId: string, productId: string, dto: CommissionProductRateDto): Promise<CommissionProductRate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const table = await this.tableOf(storeId, tableId);
    const product = UUID.test(productId) ? await this.prisma.product.findFirst({ where: { id: productId, storeId }, select: { id: true } }) : null;
    if (!product) throw new NotFoundException(affiliateError('PRODUCT_NOT_FOUND', `No product ${productId} in this shop`));

    const key = { tableId: table.id, productId: product.id };
    const row = await this.prisma.commissionTableRate.upsert({ where: { tableId_productId: key }, create: { ...key, rateBps: dto.rateBps }, update: { rateBps: dto.rateBps } });
    return { productId: row.productId, rateBps: row.rateBps };
  }

  /** Back to the table's own rate. A product with none already is answered the same. */
  async removeRate(storeSlug: string, userId: string, tableId: string, productId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const table = await this.tableOf(storeId, tableId);
    // A table's rates are its own shop's products only, as `setRate` writes them: the table is the whole check.
    if (UUID.test(productId)) await this.prisma.commissionTableRate.deleteMany({ where: { tableId: table.id, productId } });
  }

  /** A category's own rate on the table: its products pay it, unless they have their own. */
  async setCategoryRate(storeSlug: string, userId: string, tableId: string, categoryId: string, dto: CommissionCategoryRateDto): Promise<CommissionCategoryRate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const table = await this.tableOf(storeId, tableId);
    const category = UUID.test(categoryId) ? await this.prisma.productCategory.findFirst({ where: { id: categoryId, storeId }, select: { id: true } }) : null;
    if (!category) throw new NotFoundException(affiliateError('PRODUCT_CATEGORY_NOT_FOUND', `No category ${categoryId} in this shop`));

    const key = { tableId: table.id, categoryId: category.id };
    const row = await this.prisma.commissionTableCategoryRate.upsert({ where: { tableId_categoryId: key }, create: { ...key, rateBps: dto.rateBps }, update: { rateBps: dto.rateBps } });
    return { categoryId: row.categoryId, rateBps: row.rateBps };
  }

  /** Back to the table's own rate for the category's products. A category with none already is answered the same. */
  async removeCategoryRate(storeSlug: string, userId: string, tableId: string, categoryId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const table = await this.tableOf(storeId, tableId);
    // As with a product's: a table's category rates are its own shop's categories only.
    if (UUID.test(categoryId)) await this.prisma.commissionTableCategoryRate.deleteMany({ where: { tableId: table.id, categoryId } });
  }

  /** A table of this shop's; another shop's, or none at all, is one answer. */
  private async tableOf(storeId: string, tableId: string): Promise<CommissionTableModel> {
    const row = UUID.test(tableId) ? await this.prisma.commissionTable.findFirst({ where: { id: tableId, storeId } }) : null;
    if (!row) throw new NotFoundException(affiliateError('COMMISSION_TABLE_NOT_FOUND', 'No such commission table in this shop'));
    return row;
  }

  private async tableWithRates(table: CommissionTableModel): Promise<CommissionTable> {
    const [rates, categoryRates] = await Promise.all([
      this.prisma.commissionTableRate.findMany({ where: { tableId: table.id }, orderBy: { productId: 'asc' } }),
      this.prisma.commissionTableCategoryRate.findMany({ where: { tableId: table.id }, orderBy: { categoryId: 'asc' } }),
    ]);
    return toCommissionTable({ ...table, rates, categoryRates });
  }
}
