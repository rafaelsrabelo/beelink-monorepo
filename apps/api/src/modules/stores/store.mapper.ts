// Types
import type {
  PublicStore,
  Store as WireStore,
  StoreCategory as WireStoreCategory,
} from '@harness-monorepo/contracts';
import type { StoreCategoryModel, StoreModel } from '../../generated/prisma/models.js';

// App
import {
  sectionInclude,
  type SectionRow,
} from '../page/page.mapper.js';
import {
  NO_SHELVES,
  NO_SLUGS,
  toPublicSection,
  type ShelvesByComponent,
  type SlugsByEntity,
} from '../page/page-public.mapper.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { parseLayoutSettings } from './store-layout-settings.schema.js';

/**
 * Every read that becomes a `Store` or a `PublicStore` asks for the taxonomy row and the banners.
 *
 * The banners are here rather than on the catalogue because the shop window fetches the shop first
 * and unconditionally — so they cost no round trip — and because the catalogue is paged: banners on
 * it would be re-serialised into every `?pagina=` and `?categoria=` answer Google indexes. The cost
 * is that they travel to the product and category pages too, which do not draw them.
 */
export type StoreRow = StoreModel & {
  category: StoreCategoryModel | null;
  sections: SectionRow[];
};

/** The one query shape the store mappers accept, so a call site cannot forget the include. */
export const storeInclude = {
  category: true,
  // Only the bands a visitor may see, in the shopkeeper's order. A hidden one is still in the
  // panel; it simply never reaches this shape. Ordered by position alone — `create` hands out the
  // next one per shop, so two bands never share a number and there is no tie to break.
  //
  // Hidden COMPONENTS are dropped a level down, in `toPublicSection`, and not here: this include
  // is the panel's too, and the panel has to see what it is hiding.
  sections: {
    where: { isActive: true },
    orderBy: { position: 'asc' },
    include: sectionInclude,
  },
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
/**
 * `slugs` carries what the hero's slides point at, looked up once for the whole shop.
 *
 * Defaulted to nothing rather than required, and that is the safe default: a call site that has
 * not looked them up gets slides that are pictures instead of links. The alternative — guessing —
 * would put a wrong address on the page a stranger asked for.
 */
export function toPublicStore(
  row: StoreRow,
  slugs: SlugsByEntity = NO_SLUGS,
  shelves: ShelvesByComponent = NO_SHELVES,
): PublicStore {
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
    // Four columns on the way out, one object on the wire — the seam the schema note promised.
    colors: {
      background: row.colorBackground,
      primary: row.colorPrimary,
      footer: row.colorFooter,
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
    // Resolved here, where the shop's slug and its route words are already in hand: a banner
    // stores what it points at, never where it lives.
    sections: row.sections.map((section) =>
      toPublicSection(section, row.slug, ROUTE_WORDS[row.routeVocabulary], slugs, shelves),
    ),
  } satisfies PublicStore;
}

/** The shop as its owner sees it: the public shape plus what only the owner may read. */
export function toStore(row: StoreRow, slugs: SlugsByEntity = NO_SLUGS): WireStore {
  return {
    ...toPublicStore(row, slugs),
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
