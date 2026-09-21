// Types
import type {
  PublicStore,
  Store as WireStore,
  StoreCategory as WireStoreCategory,
} from '@harness-monorepo/contracts';
import type { StoreCategoryModel, StoreModel } from '../../generated/prisma/models.js';

// App
import { parseLayoutSettings } from './store-layout-settings.schema.js';

/** Every read that becomes a `Store` asks for the taxonomy row, so the mapper can demand it. */
export type StoreRow = StoreModel & { category: StoreCategoryModel | null };

/** The one query shape `toStore` accepts, so a call site cannot forget the include. */
export const storeInclude = { category: true } as const;

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
export function toPublicStore(row: StoreModel): PublicStore {
  return {
    id: row.id,
    slug: row.slug,
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
