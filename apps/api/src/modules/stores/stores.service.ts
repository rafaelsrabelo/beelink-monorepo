// Nest
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { PublicStore, RouteVocabulary, Store, StoreAddress, StoreErrorCode, StoreMovedDetails, StoreSlugAvailability, StoreSlugChangeTooSoonDetails, StoreSlugMove } from '@harness-monorepo/contracts';
import type { CreateStoreDto, UpdateStoreDto } from './dto/store.dto.js';
import type { StoreRow } from './store.mapper.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { openTrial } from '../billing/subscription-trial.js';
import { openingPageOf, refuseShopWithoutWhatsapp } from './store-opening.js';
import { StoreGeocoder } from './store-geocoder.service.js';
import type { StoreColorsDto } from './dto/store-fields.dto.js';
import { homeSectionsOf, storeInclude, toPublicStore, toStore, toUnavailablePublicStore } from './store.mapper.js';
import { writeBands } from '../page/page-bands-write.js';
import { freezePage } from '../page/page-freeze.js';
import { lookupsOf } from '../page/page-resolve.js';
import { RESERVED_SLUGS } from './stores.constants.js';
import { lockSlug, missingStore, slugChangeableOn, slugMoves, slugProblemOf, slugTaken } from './store-slugs.js';

/** Keeps every code this module answers inside the contract's union. */
function storeError(errorCode: StoreErrorCode, message: string, details?: object): { errorCode: StoreErrorCode; message: string; details?: object } {
  return details ? { errorCode, message, details } : { errorCode, message };
}

const slugTakenError = (slug: string) => new ConflictException(storeError('STORE_SLUG_TAKEN', `"${slug}" is already a shop's address`));

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

    // Asked here too, before the geocoder is: an address left by a page is taken (BEELINK-331).
    if (await slugTaken(this.prisma, dto.slug)) throw slugTakenError(dto.slug);

    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);
    refuseShopWithoutWhatsapp(dto.type, dto.socialNetworks.whatsapp);

    const address = addressColumns(dto.address);
    const point = await this.geocoder.locate(toWireAddress(address));

    try {
      /*
        The shop, what it owes bee-link and its landing page, in one transaction.

        The page is seeded here and not on the first visit to design mode: a shop with no products
        band draws nothing at `/<slug>`, and the only report of that state read "tenho produtos
        criados, mas não aparece". A component carries its shop's id beside its band's, so the bands
        are written after the row exists rather than nested inside its create.
      */
      const row = await this.prisma.$transaction(async (tx) => {
        // The address is claimed under its lock, as a change of address claims one (`store-slugs.ts`).
        await lockSlug(tx, dto.slug);
        if (await slugTaken(tx, dto.slug)) throw slugTakenError(dto.slug);

        const created = await tx.store.create({
          // The payment methods are read back rather than taken from the body: the create form
          // does not ask for them, so a new shop opens with the column's default.
          select: { id: true, paymentMethods: true, createdAt: true },
          data: {
            ownerId,
            slug: dto.slug,
            name: dto.name,
            type: dto.type,
            description: dto.description ?? null,
            logoUrl: dto.logoUrl ?? null,
            faviconUrl: dto.faviconUrl ?? null,
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

        // Its trial, counted from the row's own instant: a page that exists always knows when its
        // trial ends, and one whose subscription cannot be written is not created (BEELINK-219).
        await openTrial(tx, created.id, created.createdAt);

        // The home, published from the start: `/<slug>` is served the moment the shop exists.
        const home = await tx.storePage.create({
          data: { storeId: created.id, kind: 'HOME', slug: null, title: 'Página inicial', status: 'PUBLISHED', publishedAt: new Date() },
          select: { id: true },
        });
        await writeBands(tx, created.id, home.id, openingPageOf(dto, created.paymentMethods));
        // And frozen as its first version, which is what a visitor is served: a shop is never a
        // draft nobody published.
        await freezePage(tx, { storeId: created.id, pageId: home.id, authorId: ownerId });

        return tx.store.findUniqueOrThrow({ where: { id: created.id }, include: storeInclude });
      });

      return toStore(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw slugTakenError(dto.slug);
      throw error;
    }
  }

  /**
   * A new address for the page (BEELINK-331), by the creation's rules, at most once every 30 days. The
   * address it leaves goes to the history in the same transaction — still the page's, and leading to
   * the new one — and one the page itself once left is taken back out of it.
   *
   * Checked before, for an answer that costs no lock, and again inside: the page's row is held first,
   * so two changes of one page make one, and the new address's lock after it, so two pages claiming
   * one address make one. Nothing takes the two the other way round.
   */
  async changeSlug(slug: string, userId: string, next: string, now: Date = new Date()): Promise<Store> {
    const page = await this.assertOwnership(slug, userId);
    refuseSlug(next, page.slug);
    refuseTooSoon(page.slugChangedAt, now);

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT 1 FROM "stores" WHERE "id" = ${page.id}::uuid FOR UPDATE`;
        const held = await tx.store.findUnique({ where: { id: page.id }, select: { slug: true, slugChangedAt: true } });
        if (!held) throw await missingStore(tx, slug);
        // Another change went first: the address this one was asked by is already one the page left.
        if (held.slug !== slug) throw movedError(slug, held.slug);
        refuseTooSoon(held.slugChangedAt, now);

        await lockSlug(tx, next);
        if (await slugTaken(tx, next, page.id)) throw slugTakenError(next);

        await tx.storeSlugHistory.deleteMany({ where: { slug: next, storeId: page.id } });
        await tx.storeSlugHistory.create({ data: { slug, storeId: page.id, leftAt: now } });
        return tx.store.update({ where: { id: page.id }, data: { slug: next, slugChangedAt: now }, include: storeInclude });
      });

      return toStore(row, now);
    } catch (error) {
      if (isUniqueViolation(error)) throw slugTakenError(next);
      throw error;
    }
  }

  /** Whether an address may be the page's new one, as the change would answer it — a warning, never a promise. */
  async slugAvailability(slug: string, userId: string, next: string): Promise<StoreSlugAvailability> {
    const page = await this.assertOwnership(slug, userId);
    const answer = (reason: StoreSlugAvailability['reason']): StoreSlugAvailability => ({ slug: next, available: reason === null, reason });

    if (next === page.slug) return answer('UNCHANGED');
    const problem = slugProblemOf(next);
    if (problem) return answer(problem);
    return answer((await slugTaken(this.prisma, next, page.id)) ? 'TAKEN' : null);
  }

  /** Every address a page left and the one it has now, for the web's copy. */
  moves(): Promise<StoreSlugMove[]> {
    return slugMoves(this.prisma);
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
    const { id } = await this.assertOwnership(slug, userId);

    // By the id: the address may change between the check and the write (BEELINK-331).
    const row = await this.prisma.store.update({
      where: { id },
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
      where: { id: current.id },
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description ?? null,
        logoUrl: dto.logoUrl ?? null,
        faviconUrl: dto.faviconUrl ?? null,
        bannerImageUrl: dto.bannerImageUrl ?? null,
        categoryId: dto.categoryId ?? null,
        layoutType: dto.layoutType,
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
        ...(dto.inactiveAfterDays === undefined ? {} : { inactiveAfterDays: dto.inactiveAfterDays }),
      },
      include: storeInclude,
    });

    return toStore(row);
  }

  /**
   * The anonymous read. It answers the narrow shape, so nothing private can leak by forgetting a select.
   * `unavailable`: the page is locked for want of payment (BEELINK-223), and the shop window is off the
   * air — who the shop is, nothing it sells, and no showcase looked up.
   */
  async publicBySlug(slug: string, unavailable = false): Promise<PublicStore> {
    const row = await this.prisma.store.findUnique({ where: { slug }, include: storeInclude });
    if (!row) throw await missingStore(this.prisma, slug);
    if (unavailable) return toUnavailablePublicStore(row);

    const sections = homeSectionsOf(row);
    return toPublicStore(row, await lookupsOf(this.prisma, row.id, sections), sections);
  }

  /**
   * The same lookup with no owner: a visitor reading a shop window is nobody, and the catalogue
   * they are served is the one the shopkeeper published. It selects the id alone for the same
   * reason `ownedStoreId` selects two columns — this runs on every storefront read.
   */
  async publicStoreId(slug: string): Promise<string> {
    const row = await this.prisma.store.findUnique({ where: { slug }, select: { id: true } });

    if (!row) throw await missingStore(this.prisma, slug);

    return row.id;
  }

  /** A shop by its slug, as its accounts' e-mails name it and spell its links; 404 when there is none. */
  async publicStoreNaming(slug: string): Promise<{ id: string; name: string; routeVocabulary: RouteVocabulary }> {
    const row = await this.prisma.store.findUnique({ where: { slug }, select: { id: true, name: true, routeVocabulary: true } });

    if (!row) throw await missingStore(this.prisma, slug);

    return row;
  }

  /**
   * The same ownership rule, for a module that needs the shop's id and nothing else about it.
   *
   * It exists so the catalogue does not copy `assertOwnership` — which is exactly how the legacy
   * ended up with 25 inconsistent versions of this check. It selects two columns rather than
   * reusing the private method, because a product write has no use for the shop's address, colours
   * and taxonomy row, and this runs on every one of them.
   */
  async ownedStoreId(slug: string, userId: string): Promise<string> {
    const row = await this.prisma.store.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!row) throw await missingStore(this.prisma, slug);

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
    if (!row) throw await missingStore(this.prisma, slug);

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

/** What a body's new address is refused for before anyone is asked: the creation's rules, and being the one the page has. */
function refuseSlug(next: string, current: string): void {
  if (next === current) throw new BadRequestException(storeError('STORE_SLUG_UNCHANGED', `"${next}" is the page's address already`));
  const problem = slugProblemOf(next);
  if (problem === 'RESERVED') throw new BadRequestException(storeError('STORE_SLUG_RESERVED', `"${next}" is a route of the app itself`));
  if (problem === 'INVALID') throw new BadRequestException(storeError('STORE_SLUG_INVALID', `"${next}" is not an address`));
}

/** Within 30 days of the last change, refused with the first day another is accepted. */
function refuseTooSoon(changedAt: Date | null, now: Date): void {
  const changeableOn = slugChangeableOn(changedAt, now);
  if (changeableOn) {
    throw new ConflictException(storeError('STORE_SLUG_CHANGE_TOO_SOON', `The address changed less than 30 days ago; again from ${changeableOn}`, { changeableOn } satisfies StoreSlugChangeTooSoonDetails));
  }
}

/** `STORE_MOVED`, when the page's address is known already — `missingStore` asks the history for it otherwise. */
function movedError(left: string, now: string): NotFoundException {
  return new NotFoundException(storeError('STORE_MOVED', `"${left}" is an address its page left`, { slug: now } satisfies StoreMovedDetails));
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
