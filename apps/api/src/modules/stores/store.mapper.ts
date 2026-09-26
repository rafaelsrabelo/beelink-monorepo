// Types
import type {
  PublicStore,
  Store as WireStore,
  StoreCategory as WireStoreCategory,
} from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { StoreCategoryModel, StoreModel } from '../../generated/prisma/models.js';

// App
import { readPageDocument, servedSectionsOf, type SectionShape } from '../page/page-document.js';
import { NO_LOOKUPS, toPublicSection, type PageLookups } from '../page/page-public.mapper.js';
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
  /** The home's last published version, or none: its document is what `/<slug>` is served. */
  pageVersions: { document: Prisma.JsonValue }[];
  pages: { slug: string | null; title: string }[];
};

/** The one query shape the store mappers accept, so a call site cannot forget the include. */
export const storeInclude = {
  category: true,
  // The home as last published, and not the rows the panel edits: those are the draft, which a
  // visitor is not served until Publicar freezes it. Hidden bands are in the document and are
  // dropped when it is read (`homeSectionsOf`); hidden blocks a level down, in `toPublicSection`.
  // A landing is read on its own (`LandingReadService`).
  pageVersions: {
    where: { page: { kind: 'HOME' } },
    orderBy: { number: 'desc' },
    take: 1,
    select: { document: true },
  },
  // The published landings the shop links from its menu and footer, oldest first.
  pages: {
    where: { kind: 'LANDING', status: 'PUBLISHED', inMenu: true },
    orderBy: { createdAt: 'asc' },
    select: { slug: true, title: true },
  },
} as const;

/** The home's bands a visitor is served, from its last published version. None before the first. */
export function homeSectionsOf(row: Pick<StoreRow, 'pageVersions'>): SectionShape[] {
  return servedSectionsOf(readPageDocument(row.pageVersions[0]?.document));
}

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
 * `lookups` carries what the home's blocks point at and draw, looked up once for the whole shop.
 *
 * Defaulted to nothing rather than required, and that is the safe default: a call site that has
 * not looked them up gets slides that are pictures instead of links. The alternative — guessing —
 * would put a wrong address on the page a stranger asked for.
 */
export function toPublicStore(
  row: StoreRow,
  lookups: PageLookups = NO_LOOKUPS,
  // Read once by a caller that also looked its showcases up; read here otherwise.
  sections: readonly SectionShape[] = homeSectionsOf(row),
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
    sections: sections.map((section) =>
      toPublicSection(section, row.slug, ROUTE_WORDS[row.routeVocabulary], lookups),
    ),
    pages: row.pages.flatMap((page) => (page.slug ? [{ slug: page.slug, title: page.title }] : [])),
  } satisfies PublicStore;
}

/** The shop as its owner sees it: the public shape plus what only the owner may read. */
export function toStore(row: StoreRow): WireStore {
  return {
    ...toPublicStore(row),
    ownerId: row.ownerId,
    inactiveAfterDays: row.inactiveAfterDays,
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
