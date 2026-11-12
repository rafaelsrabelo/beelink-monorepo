// Nest
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliateCommissionPayload } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { COMMISSION_TABLE_NAME_MAX, affiliateError } from './affiliates.constants.js';

/*
  An affiliate's own commission (the user's review, 12/11/2026): a table of theirs alone, made by the
  API from what the invite or the record typed, and from then on a table like any other — the table
  screen edits it, and the order reads it by the same rule, product ?? category ?? general.
*/

type Tx = Prisma.TransactionClient;

const lower = (id: string): string => id.toLowerCase();

/** Each category and product named once, and the shop's own — or why not, before anything is written. */
export async function checkOwnCommission(prisma: PrismaService, storeId: string, commission: AffiliateCommissionPayload): Promise<void> {
  const categoryIds = commission.categoryRates.map((rate) => lower(rate.categoryId));
  const productIds = commission.productRates.map((rate) => lower(rate.productId));
  if (new Set(categoryIds).size !== categoryIds.length || new Set(productIds).size !== productIds.length) {
    throw new BadRequestException(affiliateError('AFFILIATE_INVALID', 'A category or a product is named twice'));
  }

  const [categories, products] = await Promise.all([
    categoryIds.length > 0 ? prisma.productCategory.count({ where: { storeId, id: { in: categoryIds } } }) : 0,
    productIds.length > 0 ? prisma.product.count({ where: { storeId, id: { in: productIds } } }) : 0,
  ]);
  if (categories !== categoryIds.length) throw new NotFoundException(affiliateError('PRODUCT_CATEGORY_NOT_FOUND', 'A category is not in this shop'));
  if (products !== productIds.length) throw new NotFoundException(affiliateError('PRODUCT_NOT_FOUND', 'A product is not in this shop'));
}

/** "Comissão de <name>", cut to fit the column, and " (2)", " (3)"… past a name the shop already has. */
export function ownTableNameOf(affiliateName: string, taken: ReadonlySet<string>): string {
  const base = `Comissão de ${affiliateName.trim()}`;
  for (let n = 1; ; n += 1) {
    const suffix = n === 1 ? '' : ` (${n})`;
    const name = [...base].slice(0, COMMISSION_TABLE_NAME_MAX - [...suffix].length).join('').trimEnd() + suffix;
    if (!taken.has(name)) return name;
  }
}

/** The table, made with its rates; whose it is is written by the caller once the affiliate has an id. */
export async function createOwnTable(tx: Tx, storeId: string, affiliateName: string, commission: AffiliateCommissionPayload): Promise<string> {
  // Only the names that could collide: those sharing the start a generated one would have.
  const start = [...`Comissão de ${affiliateName.trim()}`].slice(0, COMMISSION_TABLE_NAME_MAX - 6).join('');
  const taken = await tx.commissionTable.findMany({ where: { storeId, name: { startsWith: start } }, select: { name: true } });
  const table = await tx.commissionTable.create({
    data: {
      storeId,
      name: ownTableNameOf(affiliateName, new Set(taken.map((row) => row.name))),
      defaultRateBps: commission.defaultRateBps,
      categoryRates: { create: commission.categoryRates.map((rate) => ({ categoryId: lower(rate.categoryId), rateBps: rate.rateBps })) },
      rates: { create: commission.productRates.map((rate) => ({ productId: lower(rate.productId), rateBps: rate.rateBps })) },
    },
    select: { id: true },
  });
  return table.id;
}

/** What the own table pays, replaced whole: the record sent the commission again. */
export async function replaceOwnRates(tx: Tx, tableId: string, commission: AffiliateCommissionPayload): Promise<void> {
  await tx.commissionTable.update({ where: { id: tableId }, data: { defaultRateBps: commission.defaultRateBps } });
  await tx.commissionTableCategoryRate.deleteMany({ where: { tableId } });
  await tx.commissionTableRate.deleteMany({ where: { tableId } });
  await tx.commissionTableCategoryRate.createMany({ data: commission.categoryRates.map((rate) => ({ tableId, categoryId: lower(rate.categoryId), rateBps: rate.rateBps })) });
  await tx.commissionTableRate.createMany({ data: commission.productRates.map((rate) => ({ tableId, productId: lower(rate.productId), rateBps: rate.rateBps })) });
}
