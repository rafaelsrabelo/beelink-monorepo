// Nest
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

// Types
import type { LandingTemplateId, PageSlugAvailability, StorePage } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CreateLandingDto, UpdatePageDto } from './dto/pages.dto.js';
import type { LandingSubject } from './landing-templates.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { coverImageOf, landingBands, PRODUCT_TEMPLATE_IDS, SITE_TEMPLATE_IDS } from './landing-templates.js';
import { writeBands } from './page-bands-write.js';
import { freezePage } from './page-freeze.js';
import { promisesOf } from './page-seed.js';
import { pageSlugOf } from './page-slug.js';
import { pageFor } from './page-scope.js';
import { PageRules, pageError } from './page.rules.js';
import { toStorePage } from './pages.mapper.js';

/** Postgres' unique violation, as Prisma reports it: the address was taken between the check and the write. */
function isTaken(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'P2002';
}

const TAKEN = 'Já existe uma página com este endereço.';

/**
 * A shop's pages: the home, which every shop has exactly one of, and the landings the shopkeeper
 * makes. Their bands are `PageService`'s; this is the page itself — its address, its words for a
 * search result, whether it is served.
 */
@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly rules: PageRules,
  ) {}

  /** The home first, then the landings, newest first. Archived ones too: they are how a landing comes back. */
  async list(storeSlug: string, userId: string): Promise<StorePage[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const rows = await this.prisma.storePage.findMany({
      where: { storeId },
      orderBy: [{ kind: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });

    return rows.map(toStorePage);
  }

  /**
   * A landing and its opening bands, in one transaction: a page with no bands is a blank screen at
   * its own address. It opens as a draft — the shopkeeper publishes it from the editor.
   */
  async create(storeSlug: string, userId: string, dto: CreateLandingDto): Promise<StorePage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const store = await this.prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { type: true, paymentMethods: true },
    });

    if (store.type === 'INSTITUTIONAL' && !(SITE_TEMPLATE_IDS as readonly LandingTemplateId[]).includes(dto.template)) {
      throw new BadRequestException(pageError('PAGE_TEMPLATE_UNAVAILABLE', 'Este modelo é de loja; um site começa em branco.'));
    }

    const { slug, valid } = pageSlugOf(dto.slug ?? dto.title);
    if (!valid) throw new BadRequestException(pageError('PAGE_SLUG_INVALID', 'Use letras e números no endereço.'));

    const subject = await this.subjectOf(storeId, dto, store.paymentMethods);

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await this.rules.lockShop(tx, storeId);
        await this.refuseTaken(tx, storeId, slug);

        const page = await tx.storePage.create({
          data: {
            storeId,
            kind: 'LANDING',
            slug,
            title: dto.title,
            inMenu: dto.inMenu ?? false,
            usesChrome: dto.usesChrome ?? true,
            seoImageUrl: coverImageOf(dto.template, subject),
          },
        });
        await writeBands(tx, storeId, page.id, landingBands(dto.template, subject));

        return page;
      });

      return toStorePage(row);
    } catch (error) {
      if (isTaken(error)) throw new ConflictException(pageError('PAGE_SLUG_TAKEN', TAKEN));
      throw error;
    }
  }

  /** Whether an address is free, as the API would store it. The landing named by `except` keeps its own. */
  async availability(storeSlug: string, userId: string, value: string, except?: string): Promise<PageSlugAvailability> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { slug, valid } = pageSlugOf(value);
    if (!valid) return { slug, available: false, reason: 'INVALID' };

    const taken = await this.prisma.storePage.findFirst({
      where: { storeId, slug, ...(except ? { id: { not: except } } : {}) },
      select: { id: true },
    });

    return taken ? { slug, available: false, reason: 'TAKEN' } : { slug, available: true, reason: null };
  }

  /**
   * A patch of a landing. The home is the shop's own address and is changed where the shop is.
   *
   * Publishing stamps the moment, again on every return from a draft or the archive: "publicada em"
   * is when the page last went up, which is what the shopkeeper is asking when they read it.
   */
  async update(storeSlug: string, userId: string, pageId: string, dto: UpdatePageDto): Promise<StorePage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const page = await pageFor(this.prisma, storeId, pageId);

    if (page.kind === 'HOME') {
      throw new BadRequestException(pageError('PAGE_HOME_FIXED', 'A página inicial é a própria loja; ela se ajusta nas configurações.'));
    }

    const next = dto.slug !== undefined ? pageSlugOf(dto.slug) : null;
    if (next && !next.valid) throw new BadRequestException(pageError('PAGE_SLUG_INVALID', 'Use letras e números no endereço.'));

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await this.rules.lockShop(tx, storeId);
        if (next) await this.refuseTaken(tx, storeId, next.slug, page.id);

        const current = await tx.storePage.findUniqueOrThrow({ where: { id: page.id }, select: { status: true } });
        const publishing = dto.status === 'PUBLISHED' && current.status !== 'PUBLISHED';

        // Up means the draft as it is now: a landing never goes up serving an older freeze, or none.
        if (publishing) await freezePage(tx, { storeId, pageId: page.id, authorId: userId });

        return tx.storePage.update({
          where: { id: page.id },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(next ? { slug: next.slug } : {}),
            ...(dto.inMenu !== undefined ? { inMenu: dto.inMenu } : {}),
            ...(dto.usesChrome !== undefined ? { usesChrome: dto.usesChrome } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(publishing ? { publishedAt: new Date() } : {}),
            // Null is a value here: it is how a field is cleared back to the title's.
            ...(dto.seo?.title !== undefined ? { seoTitle: dto.seo.title } : {}),
            ...(dto.seo?.description !== undefined ? { seoDescription: dto.seo.description } : {}),
            ...(dto.seo?.imageUrl !== undefined ? { seoImageUrl: dto.seo.imageUrl } : {}),
          },
        });
      });

      return toStorePage(row);
    } catch (error) {
      if (isTaken(error)) throw new ConflictException(pageError('PAGE_SLUG_TAKEN', TAKEN));
      throw error;
    }
  }

  /** Checked under the shop's lock; the unique index is the backstop for a write that skipped it. */
  private async refuseTaken(tx: Prisma.TransactionClient, storeId: string, slug: string, except?: string): Promise<void> {
    const taken = await tx.storePage.findFirst({
      where: { storeId, slug, ...(except ? { id: { not: except } } : {}) },
      select: { id: true },
    });

    if (taken) throw new ConflictException(pageError('PAGE_SLUG_TAKEN', TAKEN));
  }

  /**
   * What the template fills its bands from, read before the write. The product is this shop's or it
   * is refused as not there — the same answer a foreign product gets from a showcase.
   */
  private async subjectOf(
    storeId: string,
    dto: CreateLandingDto,
    paymentMethods: Parameters<typeof promisesOf>[0],
  ): Promise<LandingSubject> {
    const promises = promisesOf(paymentMethods);
    const needsProduct = (PRODUCT_TEMPLATE_IDS as readonly LandingTemplateId[]).includes(dto.template);

    if (!needsProduct) return { title: dto.title, product: null, category: null, promises };
    if (!dto.productId) {
      throw new BadRequestException(pageError('PAGE_PRODUCT_REQUIRED', 'Escolha o produto da página.'));
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, storeId },
      select: {
        id: true,
        name: true,
        description: true,
        images: { orderBy: [{ position: 'asc' }, { id: 'asc' }], take: 1, select: { url: true } },
        category: { select: { id: true, name: true, description: true, imageUrl: true, isActive: true } },
      },
    });

    if (!product) throw new BadRequestException(pageError('PAGE_PRODUCT_INVALID', 'Esse produto não é desta loja.'));

    const { category } = product;

    return {
      title: dto.title,
      product: { id: product.id, name: product.name, description: product.description, imageUrl: product.images[0]?.url ?? null },
      // A hidden category is not a collection anybody can browse: the page is built around the product instead.
      category: category?.isActive
        ? { id: category.id, name: category.name, description: category.description, imageUrl: category.imageUrl }
        : null,
      promises,
    };
  }
}
