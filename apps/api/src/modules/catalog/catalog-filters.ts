// Types
import type {
  AppliedCatalogFilter,
  CatalogFacets,
  PublicProductCategory,
  StorefrontSort,
} from '@harness-monorepo/contracts';
import type {
  ProductFieldRefs,
  ProductOrderByWithRelationInput,
  ProductWhereInput,
} from '../../generated/prisma/models/Product.js';
import type { ProductVariantWhereInput } from '../../generated/prisma/models/ProductVariant.js';

// App
import { ON_THE_SHELF_WHERE } from './catalog.visibility.js';

/**
 * What a storefront listing is narrowed and ordered by, and the `where` each filter makes — pure,
 * so every facet can be asked for "everything but me" and tested without a database.
 */

export const STOREFRONT_SORTS = ['relevancia', 'menor-preco', 'maior-preco', 'novidades'] as const satisfies readonly StorefrontSort[];

export interface OptionFilter {
  /** As the address spelled it; matched without regard to case. */
  name: string;
  values: string[];
}

export interface ListingFilters {
  category?: string;
  /** As the visitor typed it, which is what the applied filters echo back. */
  search?: string;
  /**
   * The search as the column holds text, which is what is matched. The service asks Postgres for it
   * with the trigger's own `lower(unaccent())`: NFD in JavaScript strips accents but leaves º, ª, ’
   * and — as they are, and `unaccent` rewrites each of them, so "1ª linha" would never find itself.
   * Absent when the term has nothing left to match.
   */
  searchKey?: string;
  priceMinCents?: number;
  priceMaxCents?: number;
  discount: boolean;
  options: OptionFilter[];
  sort: StorefrontSort;
}

/** A filter a facet leaves out of its own count. */
export type FacetKey = 'category' | 'price' | 'discount' | `option:${string}`;

/**
 * A term matched literally by `LIKE`. Prisma's `contains` passes `%` and `_` through as wildcards, so
 * "100%" would find "1000ml" and "_" the whole shelf; the backslash is `LIKE`'s default escape.
 */
export function likeLiteral(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

/** The key two spellings of one option name share. */
export function optionKey(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR');
}

/**
 * `opcao=Tamanho:P&opcao=Tamanho:M&opcao=Cor:Areia` as groups. The name ends at the first colon,
 * so a value may hold one ("Proporção 1:2"). A malformed entry is ignored rather than refused: this
 * is the indexed read path, and a hand-edited link should land on a shelf, not on an error.
 */
export function parseOptionFilters(raw: string | string[] | undefined): OptionFilter[] {
  const groups = new Map<string, OptionFilter>();

  for (const entry of [raw ?? []].flat()) {
    const at = entry.indexOf(':');
    const name = entry.slice(0, at).trim();
    const value = entry.slice(at + 1).trim();
    if (at < 1 || !name || !value) continue;

    const group = groups.get(optionKey(name)) ?? { name, values: [] };
    if (!group.values.some((known) => optionKey(known) === optionKey(value))) group.values.push(value);
    groups.set(optionKey(name), group);
  }

  return [...groups.values()];
}

/** A variant a visitor could order now: sold, current, and counted with some left or not counted. */
export const ORDERABLE_VARIANT_WHERE: ProductVariantWhereInput = {
  isActive: true,
  archivedAt: null,
  OR: [{ trackStock: false }, { stockQuantity: { gt: 0 } }],
};

/**
 * The shelf under every filter, or every filter but one.
 *
 * Each filter is its own element of `AND`, never spread, because several carry an `OR`. Option
 * groups must hold on one combination: "P" and "Areia" means a variant that is both, not a product
 * sold in P in one colour and in Areia in another size.
 */
export function listingWhere(
  storeId: string,
  filters: ListingFilters,
  priceField: ProductFieldRefs['priceCents'],
  without?: FacetKey,
): ProductWhereInput {
  const and: ProductWhereInput[] = [ON_THE_SHELF_WHERE];

  if (filters.category && without !== 'category') {
    // A parent's shelf holds what is under it.
    and.push({
      category: {
        isActive: true,
        OR: [{ slug: filters.category }, { parent: { slug: filters.category, isActive: true } }],
      },
    });
  }

  if (filters.searchKey) and.push({ searchText: { contains: likeLiteral(filters.searchKey) } });

  if (without !== 'price') {
    if (filters.priceMinCents !== undefined) and.push({ priceCents: { gte: filters.priceMinCents } });
    if (filters.priceMaxCents !== undefined) and.push({ priceCents: { lte: filters.priceMaxCents } });
  }

  if (filters.discount && without !== 'discount') and.push({ compareAtPriceCents: { gt: priceField } });

  const groups = filters.options.filter((group) => without !== `option:${optionKey(group.name)}`);
  if (groups.length > 0) {
    and.push({
      variants: {
        some: {
          AND: [
            ORDERABLE_VARIANT_WHERE,
            ...groups.map((group) => ({
              values: {
                some: {
                  option: { name: { equals: group.name, mode: 'insensitive' as const } },
                  value: { OR: group.values.map((value) => ({ name: { equals: value, mode: 'insensitive' as const } })) },
                },
              },
            })),
          ],
        },
      },
    });
  }

  return { storeId, AND: and };
}

/** Every order ends on the id, so two products tied on everything else never swap between visits. */
export function orderByOf(sort: StorefrontSort): ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'menor-preco':
      return [{ priceCents: 'asc' }, { name: 'asc' }, { id: 'asc' }];
    case 'maior-preco':
      return [{ priceCents: 'desc' }, { name: 'asc' }, { id: 'asc' }];
    case 'novidades':
      return [{ createdAt: 'desc' }, { id: 'asc' }];
    default:
      return [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }];
  }
}

/** The filters in force, one entry per value, named as a visitor reads them. */
export function appliedOf(
  filters: ListingFilters,
  categories: readonly PublicProductCategory[],
  facets: CatalogFacets,
): AppliedCatalogFilter[] {
  const applied: AppliedCatalogFilter[] = [];

  if (filters.category) {
    const name = categories.find((category) => category.slug === filters.category)?.name;
    applied.push({ key: 'categoria', value: filters.category, label: name ?? filters.category });
  }
  if (filters.searchKey && filters.search?.trim()) applied.push({ key: 'busca', value: filters.search.trim(), label: filters.search.trim() });
  if (filters.priceMinCents !== undefined) {
    const reais = String(filters.priceMinCents / 100);
    applied.push({ key: 'precoMin', value: reais, label: reais });
  }
  if (filters.priceMaxCents !== undefined) {
    const reais = String(filters.priceMaxCents / 100);
    applied.push({ key: 'precoMax', value: reais, label: reais });
  }
  if (filters.discount) applied.push({ key: 'desconto', value: '1', label: '1' });

  for (const group of filters.options) {
    const facet = facets.options.find((entry) => optionKey(entry.name) === optionKey(group.name));
    for (const value of group.values) {
      const known = facet?.values.find((entry) => optionKey(entry.value) === optionKey(value));
      const name = facet?.name ?? group.name;
      const label = known?.label ?? value;
      applied.push({ key: 'opcao', value: `${name}:${label}`, label: `${name}: ${label}` });
    }
  }

  return applied;
}
