// Types
import type {
  PublicStore,
  Store as WireStore,
  StoreCategory as WireStoreCategory,
} from '@harness-monorepo/contracts';
import type { StoreCategoryModel, StoreModel, StoreShowcaseModel } from '../../generated/prisma/models.js';

// App
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { parseLayoutSettings } from './store-layout-settings.schema.js';

/**
 * What the public shape is built from. The showcases are part of it and not an extra argument: a
 * landing page with no blocks and a landing page whose blocks were forgotten in the `include` look
 * identical from here, and only the type can tell them apart.
 */
export type PublicStoreRow = StoreModel & { showcases: StoreShowcaseModel[] };

/** Every read that becomes a `Store` asks for the taxonomy row too, so the mapper can demand it. */
export type StoreRow = PublicStoreRow & { category: StoreCategoryModel | null };

/**
 * The one query shape `toStore` accepts, so a call site cannot forget the include.
 *
 * The hidden showcases are filtered here rather than in the mapper: a card the shopkeeper switched
 * off should not travel to a storefront at all, and a `where` on the include is the only place that
 * is true of every read at once.
 */
export const storeInclude = {
  category: true,
  showcases: { where: { isActive: true }, orderBy: { position: 'asc' } },
} as const;

export function toStoreCategory(row: StoreCategoryModel): WireStoreCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
  } satisfies WireStoreCategory;
}

/**
 * What an anonymous visitor is served. The owner, the address, the coordinates and the timestamps
 * are absent by construction rather than by a `select` somebody has to remember: this shape is what
 * ends up in Google's index, so a field is added here only on purpose.
 */
export function toPublicStore(row: PublicStoreRow): PublicStore {
  return {
    id: row.id,
    slug: row.slug,
    // The words, never the enum: the web builds every storefront link from these, so a shop that
    // switches vocabulary moves all of them at once and no component holds "produtos" itself.
    routeWords: ROUTE_WORDS[row.routeVocabulary],
    name: row.name,
    description: row.description,
    type: row.type,
    logoUrl: row.logoUrl,
    bannerImageUrl: row.bannerImageUrl,
    layoutType: row.layoutType,
    showProductsByCategory: row.showProductsByCategory,
    // Four columns on the way out, one object on the wire — the seam the schema note promised.
    colors: {
      background: row.colorBackground,
      primary: row.colorPrimary,
      text: row.colorText,
      header: row.colorHeader,
    },
    socialNetworks: {
      whatsapp: row.whatsappPhone,
      instagram: row.instagram,
      tiktok: row.tiktok,
      spotify: row.spotify,
      youtube: row.youtube,
    },
    layoutSettings: parseLayoutSettings(row.layoutSettings),
    paymentMethods: row.paymentMethods,
    showcases: row.showcases.map((showcase) => ({
      id: showcase.id,
      title: showcase.title,
      subtitle: showcase.subtitle,
      imageUrl: showcase.imageUrl,
      href: showcase.href,
      layout: showcase.layout,
    })),
  } satisfies PublicStore;
}

/** The shop as its owner sees it: the public shape plus what only the owner may read. */
export function toStore(row: StoreRow): WireStore {
  return {
    ...toPublicStore(row),
    ownerId: row.ownerId,
    address: {
      street: row.addressStreet,
      number: row.addressNumber,
      complement: row.addressComplement,
      neighborhood: row.addressNeighborhood,
      city: row.addressCity,
      state: row.addressState,
      zipCode: row.addressZipCode,
    },
    // Prisma hands back a Decimal so the value never loses precision in the database; the wire is
    // JSON, which has one number type, and eight decimal places of degrees fit a double exactly.
    latitude: row.latitude === null ? null : row.latitude.toNumber(),
    longitude: row.longitude === null ? null : row.longitude.toNumber(),
    category: row.category === null ? null : toStoreCategory(row.category),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies WireStore;
}
