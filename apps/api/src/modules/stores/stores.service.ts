// Nest
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { PublicStore, Store, StoreAddress, StoreErrorCode } from '@harness-monorepo/contracts';
import type { CreateStoreDto, UpdateStoreDto } from './dto/store.dto.js';
import type { StoreRow } from './store.mapper.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { openingPageOf, refuseShopWithoutWhatsapp } from './store-opening.js';
import { StoreGeocoder } from './store-geocoder.service.js';
import type { StoreColorsDto } from './dto/store-fields.dto.js';
import {
  NO_SHELVES,
  NO_SLUGS,
  slideTargetsOf,
  type SectionRow,
  type ShelvesByComponent,
  type SlugsByEntity,
} from '../page/page.mapper.js';
import { storeInclude, toPublicStore, toStore } from './store.mapper.js';
import { SHOWCASE_CARD_SELECT, shelfOf, showcaseQuery } from '../catalog/showcase.query.js';
import { RESERVED_SLUGS } from './stores.constants.js';

/** Keeps every code this module answers inside the contract's union. */
function storeError(errorCode: StoreErrorCode, message: string): { errorCode: StoreErrorCode; message: string } {
  return { errorCode, message };
}

/** Postgres' unique violation, as Prisma reports it — the backstop for the race a pre-check loses. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoder: StoreGeocoder,
  ) {}

  async create(ownerId: string, dto: CreateStoreDto): Promise<Store> {
    if (RESERVED_SLUGS.includes(dto.slug)) {
      throw new BadRequestException(
        storeError('STORE_SLUG_RESERVED', `"${dto.slug}" is a route of the app itself`),
      );
    }

    const taken = await this.prisma.store.findUnique({ where: { slug: dto.slug }, select: { id: true } });
    if (taken) throw new ConflictException(storeError('STORE_SLUG_TAKEN', `"${dto.slug}" is already a shop`));

    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);
    refuseShopWithoutWhatsapp(dto.type, dto.socialNetworks.whatsapp);

    const address = addressColumns(dto.address);
    const point = await this.geocoder.locate(toWireAddress(address));

    try {
      /*
        The shop and its landing page, in one transaction.

        The page is seeded here and not on the first visit to design mode: a shop with no products
        band draws nothing at `/<slug>`, and the only report of that state read "tenho produtos
        criados, mas não aparece". A component carries its shop's id beside its band's, so the bands
        are written after the row exists rather than nested inside its create.
      */
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.store.create({
          // The payment methods are read back rather than taken from the body: the create form
          // does not ask for them, so a new shop opens with the column's default.
          select: { id: true, paymentMethods: true },
          data: {
            ownerId,
            slug: dto.slug,
            name: dto.name,
            type: dto.type,
            description: dto.description ?? null,
            logoUrl: dto.logoUrl ?? null,
            categoryId: dto.categoryId ?? null,
            // Omitted colours mean the platform theme, which is the column default — so the four
            // fields are left out of the insert entirely rather than repeated here as literals.
            ...(dto.colors
              ? {
                  colorBackground: dto.colors.background,
                  colorPrimary: dto.colors.primary,
                  colorFooter: dto.colors.footer,
                  colorHeader: dto.colors.header,
                }
              : {}),
            whatsappPhone: dto.socialNetworks.whatsapp ?? null,
            instagram: dto.socialNetworks.instagram ?? null,
            tiktok: dto.socialNetworks.tiktok ?? null,
            spotify: dto.socialNetworks.spotify ?? null,
            youtube: dto.socialNetworks.youtube ?? null,
            ...address,
            latitude: point?.latitude ?? null,
            longitude: point?.longitude ?? null,
          },
        });

        for (const band of openingPageOf(dto, created.paymentMethods)) {
          await tx.storeSection.create({
            data: {
              storeId: created.id,
              ...band.section,
              components: {
                create: band.components.map((component) => ({ storeId: created.id, ...component })),
              },
            },
          });
        }

        return tx.store.findUniqueOrThrow({ where: { id: created.id }, include: storeInclude });
      });

      return toStore(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(storeError('STORE_SLUG_TAKEN', `"${dto.slug}" is already a shop`));
      }
      throw error;
    }
  }

  /** Newest first — the ordering the legacy `GET /api/user/stores` answered with. */
  async mine(ownerId: string): Promise<Store[]> {
    const rows = await this.prisma.store.findMany({
      where: { ownerId },
      include: storeInclude,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => toStore(row));
  }

  async bySlug(slug: string, userId: string): Promise<Store> {
    return toStore(await this.assertOwnership(slug, userId));
  }

  /**
   * A full replacement, not a patch: an optional key the body leaves out is cleared, because the
   * panel posts every field it edits. That includes `address` and `layoutSettings` — omitting them
   * empties them.
   */
  /**
   * The four colours, and only those.
   *
   * Its own write rather than a corner of `update`, and the reason is that `update` is a full
   * replacement — it says so in its own doc, and omitting `layoutSettings` empties the column. A
   * design-mode colour save would have had to re-post the whole shop from whatever the panel last
   * read, which makes two screens last-write-wins over each other: the settings form would repost
   * its stale copy over a colour just changed, or the other way round.
   *
   * Four columns, named one by one. There is no ink among them: every word on the shop window is
   * derived from the surface it sits on.
   */
  async updateColors(slug: string, userId: string, dto: StoreColorsDto): Promise<Store> {
    await this.assertOwnership(slug, userId);

    const row = await this.prisma.store.update({
      where: { slug },
      data: {
        colorBackground: dto.background,
        colorPrimary: dto.primary,
        colorHeader: dto.header,
        colorFooter: dto.footer,
      },
      include: storeInclude,
    });

    return toStore(row);
  }

  async update(slug: string, userId: string, dto: UpdateStoreDto): Promise<Store> {
    const current = await this.assertOwnership(slug, userId);
    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);
    refuseShopWithoutWhatsapp(dto.type, dto.socialNetworks.whatsapp);

    const address = addressColumns(dto.address);
    const moved =
      address.addressStreet !== current.addressStreet ||
      address.addressCity !== current.addressCity ||
      address.addressState !== current.addressState;

    // Only a move is worth a call to a third party; everything else about an address is cosmetic.
    const point = moved ? await this.geocoder.locate(toWireAddress(address)) : null;

    const row = await this.prisma.store.update({
      where: { slug },
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description ?? null,
        logoUrl: dto.logoUrl ?? null,
        bannerImageUrl: dto.bannerImageUrl ?? null,
        categoryId: dto.categoryId ?? null,
        layoutType: dto.layoutType,
        showProductsByCategory: dto.showProductsByCategory,
        colorBackground: dto.colors.background,
        colorPrimary: dto.colors.primary,
        colorFooter: dto.colors.footer,
        colorHeader: dto.colors.header,
        whatsappPhone: dto.socialNetworks.whatsapp ?? null,
        instagram: dto.socialNetworks.instagram ?? null,
        tiktok: dto.socialNetworks.tiktok ?? null,
        spotify: dto.socialNetworks.spotify ?? null,
        youtube: dto.socialNetworks.youtube ?? null,
        ...address,
        // Left alone when the address did not move, so a geocoder outage cannot blank a good point.
        ...(moved ? { latitude: point?.latitude ?? null, longitude: point?.longitude ?? null } : {}),
        layoutSettings: { ...dto.layoutSettings },
        paymentMethods: dto.paymentMethods,
      },
      include: storeInclude,
    });

    return toStore(row);
  }

  /** The anonymous read. It answers the narrow shape, so nothing private can leak by forgetting a select. */
  async publicBySlug(slug: string): Promise<PublicStore> {
    const row = await this.prisma.store.findUnique({ where: { slug }, include: storeInclude });
    if (!row) throw new NotFoundException(storeError('STORE_NOT_FOUND', `No shop at "${slug}"`));

    const [slugs, shelves] = await Promise.all([this.slideSlugs(row.sections), this.shelvesOf(row.id, row.sections)]);

    return toPublicStore(row, slugs, shelves);
  }

  /**
   * What every showcase on the page draws, resolved from its source: a query per showcase, in
   * parallel, and one more for the categories CATEGORY showcases name.
   *
   * Here and not in the catalogue's service because the catalogue module imports this one; the
   * query each source runs lives in `catalog/showcase.query.ts`, where the rule of what is on the
   * shelf already is. Hidden showcases are skipped — the mapper drops them anyway, and a query for a
   * shelf nobody sees is a query the anonymous page pays for.
   */
  private async shelvesOf(storeId: string, sections: SectionRow[]): Promise<ShelvesByComponent> {
    const showcases = sections
      .flatMap((section) => section.components)
      .filter((component) => component.isActive && component.kind === 'PRODUCTS');

    if (!showcases.length) return NO_SHELVES;

    const categoryIds = showcases.flatMap((showcase) =>
      showcase.source === 'CATEGORY' && showcase.sourceCategoryId ? [showcase.sourceCategoryId] : [],
    );

    const [categories, shelves] = await Promise.all([
      categoryIds.length
        ? this.prisma.productCategory.findMany({
            where: { id: { in: categoryIds }, storeId, isActive: true },
            select: { id: true, slug: true, name: true },
          })
        : [],
      Promise.all(
        showcases.map(async (showcase) => {
          const query = showcaseQuery(storeId, showcase, this.prisma.product.fields.priceCents);
          const rows = query ? await this.prisma.product.findMany({ ...query, select: SHOWCASE_CARD_SELECT }) : [];
          return [showcase, shelfOf(showcase, rows)] as const;
        }),
      ),
    ]);

    const categoryOf = new Map(categories.map((row) => [row.id, { slug: row.slug, name: row.name }]));

    return new Map(
      shelves.map(([showcase, products]) => [
        showcase.id,
        { products, category: showcase.sourceCategoryId ? (categoryOf.get(showcase.sourceCategoryId) ?? null) : null },
      ]),
    );
  }

  /**
   * What the hero's slides point at, in one round trip for the whole shop.
   *
   * A slide keeps an id rather than an address, so renaming a category moves the slide with it —
   * the promise a foreign key makes, without the foreign key, because `items` is JSON. Two `IN`
   * queries and no join: a carousel is capped at twenty slides, and this is the page a stranger
   * asks for first.
   *
   * Nothing is thrown when an id resolves to nothing. It simply is not in the map, the mapper
   * builds no address, and the slide is a picture rather than a broken link.
   */
  private async slideSlugs(sections: SectionRow[]): Promise<SlugsByEntity> {
    const { categoryIds, productIds } = slideTargetsOf(sections);

    if (!categoryIds.length && !productIds.length) return NO_SLUGS;

    const [categories, products] = await Promise.all([
      categoryIds.length
        ? this.prisma.productCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, slug: true },
          })
        : [],
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, slug: true },
          })
        : [],
    ]);

    return {
      categories: new Map(categories.map((row) => [row.id, row.slug])),
      products: new Map(products.map((row) => [row.id, row.slug])),
    };
  }

  /**
   * The same ownership rule, for a module that needs the shop's id and nothing else about it.
   *
   * It exists so the catalogue does not copy `assertOwnership` — which is exactly how the legacy
   * ended up with 25 inconsistent versions of this check. It selects two columns rather than
   * reusing the private method, because a product write has no use for the shop's address, colours
   * and taxonomy row, and this runs on every one of them.
   */
  /**
   * The same lookup with no owner: a visitor reading a shop window is nobody, and the catalogue
   * they are served is the one the shopkeeper published. It selects the id alone for the same
   * reason `ownedStoreId` selects two columns — this runs on every storefront read.
   */
  async publicStoreId(slug: string): Promise<string> {
    const row = await this.prisma.store.findUnique({ where: { slug }, select: { id: true } });

    if (!row) throw new NotFoundException(storeError('STORE_NOT_FOUND', `No shop at "${slug}"`));

    return row.id;
  }

  async ownedStoreId(slug: string, userId: string): Promise<string> {
    const row = await this.prisma.store.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!row) throw new NotFoundException(storeError('STORE_NOT_FOUND', `No shop at "${slug}"`));

    if (row.ownerId !== userId) {
      throw new ForbiddenException(storeError('STORE_FORBIDDEN', `"${slug}" belongs to someone else`));
    }

    return row.id;
  }

  /**
   * This method is what replaced the Supabase RLS policy the legacy leaned on — whose update rule
   * was `USING (auth.role() = 'authenticated')`, letting any signed-in person edit any shop — and
   * the 25 route handlers that then copied the check by hand, inconsistently. Every owner-facing
   * read and every write goes through here, so the rule has one place to be right.
   *
   * It is a private method and **not** a `StoreOwnershipGuard`: no such guard exists anywhere in
   * this repository, and a comment elsewhere that names one is describing something never built. A
   * guard would have to load the shop to decide and the handler would then load it again, so the
   * check lives where the row is already in hand and is returned rather than thrown away.
   *
   * A shop that exists but belongs to someone else answers 403, not 404. The 403 does confirm the
   * slug exists, but `/<slug>` is a public storefront: its existence is already readable by anyone.
   * A 404 would buy no secrecy and would tell an owner whose session drifted that their shop is gone.
   */
  private async assertOwnership(slug: string, userId: string): Promise<StoreRow> {
    const row = await this.prisma.store.findUnique({ where: { slug }, include: storeInclude });
    if (!row) throw new NotFoundException(storeError('STORE_NOT_FOUND', `No shop at "${slug}"`));

    if (row.ownerId !== userId) {
      throw new ForbiddenException(storeError('STORE_FORBIDDEN', `"${slug}" belongs to someone else`));
    }

    return row;
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.prisma.storeCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException(storeError('STORE_CATEGORY_NOT_FOUND', `No store category ${categoryId}`));
    }
  }
}

/** The seam the schema note promised: one object on the wire, seven columns in the database. */
function addressColumns(address: UpdateStoreDto['address']): {
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
} {
  return {
    addressStreet: address?.street ?? null,
    addressNumber: address?.number ?? null,
    addressComplement: address?.complement ?? null,
    addressNeighborhood: address?.neighborhood ?? null,
    addressCity: address?.city ?? null,
    addressState: address?.state ?? null,
    addressZipCode: address?.zipCode ?? null,
  };
}

function toWireAddress(columns: ReturnType<typeof addressColumns>): StoreAddress {
  return {
    street: columns.addressStreet,
    number: columns.addressNumber,
    complement: columns.addressComplement,
    neighborhood: columns.addressNeighborhood,
    city: columns.addressCity,
    state: columns.addressState,
    zipCode: columns.addressZipCode,
  } satisfies StoreAddress;
}
