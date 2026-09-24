// Nest
import { Injectable } from '@nestjs/common';

// Types
import type {
  AppliedCatalogFilter,
  CatalogFacets,
  CatalogFacetValue,
  CatalogOptionFacet,
  PublicProductCard,
  PublicProductCategory,
} from '@harness-monorepo/contracts';
import type { ProductWhereInput } from '../../generated/prisma/models/Product.js';

// App
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import {
  appliedOf,
  DISCOUNT_RANGES,
  listingWhere,
  optionKey,
  orderByOf,
  type FacetKey,
  type ListingFilters,
} from './catalog-filters.js';
import { productCardInclude, toPublicProductCard } from './catalog.mapper.js';
import { ON_THE_SHELF_WHERE } from './catalog.visibility.js';

interface OptionCountRow {
  optionKey: string;
  optionName: string;
  optionPosition: number;
  valueKey: string;
  valueName: string;
  valuePosition: number;
  colorHex: string | null;
  count: number;
}

export interface StorefrontListing {
  products: PublicProductCard[];
  total: number;
  facets: CatalogFacets;
  applied: AppliedCatalogFilter[];
}

/**
 * The storefront's shelf: one page of what a shop published, filtered, ordered, and the facets that
 * say what else it can be narrowed by.
 *
 * Each facet counts under every filter but its own, as a shop's facets do: with "P" chosen, Tamanho
 * still says how many there are in M, and every other facet counts inside P. The page and its total
 * are read in one transaction, so the pager never disagrees with its pages; the facets are read
 * beside them, in parallel, because a count a moment off is a count, and the wait is the visitor's.
 */
@Injectable()
export class StorefrontListingService {
  constructor(private readonly prisma: PrismaService) {}

  async listing(
    storeId: string,
    filters: ListingFilters,
    page: number,
    pageSize: number,
    categories: readonly PublicProductCategory[],
  ): Promise<StorefrontListing> {
    filters = { ...filters, searchKey: await this.searchKeyOf(filters.search) };
    const where = this.where(storeId, filters);

    const [[rows, total], facets] = await Promise.all([
      this.prisma.$transaction([
        this.prisma.product.findMany({
          where,
          include: productCardInclude,
          orderBy: orderByOf(filters.sort),
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.product.count({ where }),
      ]),
      this.facetsOf(storeId, filters, categories),
    ]);

    return {
      products: rows.map(toPublicProductCard),
      total,
      facets,
      applied: appliedOf(filters, categories, facets),
    };
  }

  /** The term as the trigger writes the column: see `ListingFilters.searchKey`. */
  private async searchKeyOf(search: string | undefined): Promise<string | undefined> {
    const term = search?.trim();
    if (!term) return undefined;

    const [row] = await this.prisma.$queryRaw<{ key: string }[]>(Prisma.sql`SELECT trim(lower(unaccent(${term}))) AS "key"`);
    return row?.key || undefined;
  }

  private where(storeId: string, filters: ListingFilters, without?: FacetKey): ProductWhereInput {
    return listingWhere(storeId, filters, this.prisma.product.fields.priceCents, without);
  }

  private async facetsOf(
    storeId: string,
    filters: ListingFilters,
    categories: readonly PublicProductCategory[],
  ): Promise<CatalogFacets> {
    const withoutPrice = this.where(storeId, filters, 'price');

    const withoutDiscount = this.where(storeId, filters, 'discount');
    const [byCategory, discount, price, options, ...cuts] = await Promise.all([
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: this.where(storeId, filters, 'category'),
        _count: { _all: true },
      }),
      this.prisma.product.count({
        where: { AND: [this.where(storeId, filters, 'discount'), { compareAtPriceCents: { gt: this.prisma.product.fields.priceCents } }] },
      }),
      this.prisma.product.aggregate({ where: withoutPrice, _min: { priceCents: true }, _max: { priceCents: true } }),
      this.optionFacetsOf(storeId, filters),
      // Each cut counted without the discount filter, as the discount itself is: choosing "20%
      // ou mais" must not make "10% ou mais" read as the same number.
      ...DISCOUNT_RANGES.map((minPercent) =>
        this.prisma.product.count({ where: { AND: [withoutDiscount, { discountPercent: { gte: minPercent } }] } }),
      ),
    ]);

    const own = new Map(byCategory.map((row) => [row.categoryId, row._count._all]));
    const countOf = (category: PublicProductCategory) =>
      (own.get(category.id) ?? 0) +
      categories
        .filter((child) => child.parentSlug === category.slug)
        .reduce((sum, child) => sum + (own.get(child.id) ?? 0), 0);

    return {
      categories: categories.map((category) => {
        const count = countOf(category);
        return {
          value: category.slug,
          label: category.name,
          count,
          available: count > 0,
          selected: category.slug === filters.category,
          colorHex: null,
        } satisfies CatalogFacetValue;
      }),
      options,
      discount: {
        count: discount,
        selected: filters.discount,
        ranges: DISCOUNT_RANGES.map((minPercent, at) => ({
          minPercent,
          count: cuts[at] ?? 0,
          selected: filters.discountMinPercent === minPercent,
        })),
      },
      price:
        price._min.priceCents === null || price._max.priceCents === null
          ? null
          : { minCents: price._min.priceCents, maxCents: price._max.priceCents },
    };
  }

  /**
   * One facet per option name on the shelf. Every value the shelf sells is listed — one with nothing
   * under the other filters comes back unavailable rather than missing, so a list of sizes does not
   * reshuffle itself as filters change. A filtered option counts without its own filter; the others
   * count under all of them.
   */
  private async optionFacetsOf(storeId: string, filters: ListingFilters): Promise<CatalogOptionFacet[]> {
    const filtered = filters.options.map((group) => optionKey(group.name));

    const [universe, underAll, ...underEach] = await Promise.all([
      // Every value the shelf sells, sold out or not: a sold-out size is listed as unavailable.
      this.idsOf({ storeId, AND: [ON_THE_SHELF_WHERE] }).then((ids) => this.optionCounts(ids, false)),
      this.idsOf(this.where(storeId, filters)).then((ids) => this.optionCounts(ids)),
      ...filtered.map((key) => this.idsOf(this.where(storeId, filters, `option:${key}`)).then((ids) => this.optionCounts(ids))),
    ]);

    const countsFor = (key: string) => underEach[filtered.indexOf(key)] ?? underAll;
    const facets = new Map<string, { name: string; position: number; values: (CatalogFacetValue & { position: number })[] }>();

    for (const row of universe) {
      const counts = countsFor(row.optionKey);
      const count = counts.find((entry) => entry.optionKey === row.optionKey && entry.valueKey === row.valueKey)?.count ?? 0;
      const group = filters.options.find((entry) => optionKey(entry.name) === row.optionKey);
      const facet = facets.get(row.optionKey) ?? { name: row.optionName, position: row.optionPosition, values: [] };

      facet.values.push({
        value: row.valueName,
        label: row.valueName,
        count,
        available: count > 0,
        selected: group?.values.some((value) => optionKey(value) === row.valueKey) ?? false,
        colorHex: row.colorHex,
        position: row.valuePosition,
      });
      facets.set(row.optionKey, facet);
    }

    return [...facets.values()]
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pt-BR'))
      .map((facet) => ({
        name: facet.name,
        values: facet.values
          .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label, 'pt-BR'))
          .map(({ position: _position, ...value }) => value),
      }));
  }

  private async idsOf(where: ProductWhereInput): Promise<string[]> {
    return (await this.prisma.product.findMany({ where, select: { id: true } })).map((row) => row.id);
  }

  /**
   * Products per option value, among these products, counting combinations the shop sells — only
   * those a visitor could order now, unless `orderable` is false. SQL because Prisma cannot count
   * distinct products through the join rows. Option and value names are grouped without regard to
   * case or spaces, as the facets present them.
   */
  private async optionCounts(ids: readonly string[], orderable = true): Promise<OptionCountRow[]> {
    if (ids.length === 0) return [];
    const inStock = orderable
      ? Prisma.sql`AND (NOT v."trackStock" OR COALESCE(v."stockQuantity", 0) > 0)`
      : Prisma.empty;

    return this.prisma.$queryRaw<OptionCountRow[]>(Prisma.sql`
      SELECT
        lower(trim(o."name")) AS "optionKey",
        min(o."name") AS "optionName",
        min(o."position")::int AS "optionPosition",
        lower(trim(ov."name")) AS "valueKey",
        min(ov."name") AS "valueName",
        min(ov."position")::int AS "valuePosition",
        min(ov."colorHex") AS "colorHex",
        count(DISTINCT v."productId")::int AS "count"
      FROM "product_variant_values" vv
      JOIN "product_variants" v ON v."id" = vv."variantId"
      JOIN "product_options" o ON o."id" = vv."optionId"
      JOIN "product_option_values" ov ON ov."id" = vv."valueId"
      WHERE v."productId" = ANY(${[...ids]}::uuid[])
        AND v."isActive" AND v."archivedAt" IS NULL
        ${inStock}
      GROUP BY 1, 4
    `);
  }
}
