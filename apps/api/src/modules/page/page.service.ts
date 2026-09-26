// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { Section } from '@harness-monorepo/contracts';
import type { CreateSectionDto, UpdateSectionDto } from './dto/page.dto.js';
import type { ReorderDto } from '../catalog/dto/reorder.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { sectionInclude, toSection } from './page.mapper.js';
import { pageOf } from './page-read.js';
import { PageRules } from './page.rules.js';
import { componentRow, copiedRow, placedAt } from './page-rows.js';
import { ShowcaseRules } from './showcase.rules.js';
import { openingItemsOf } from './page-seed.js';

/**
 * The bands of the landing page. A band and the block it is built around are created together,
 * here; the blocks' own writes are `PageComponentsService`'s.
 */
@Injectable()
export class PageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly rules: PageRules,
    private readonly showcases: ShowcaseRules,
  ) {}

  /** The panel's read: hidden bands and hidden components included, in the arranged order. */
  async list(storeSlug: string, userId: string): Promise<Section[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    return pageOf(this.prisma, storeId);
  }

  /**
   * A new band, and the one component it is built around.
   *
   * Both in one transaction: a band with nothing in it draws nothing, so a half-written pair is a
   * row the shopkeeper can only meet as a gap in their own editor.
   */
  async createSection(storeSlug: string, userId: string, dto: CreateSectionDto): Promise<Section> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    await this.rules.refuseSecond(storeId, dto.component.kind);
    this.rules.refuseDisplayFor(dto.component.kind, dto.component.display);
    this.rules.refuseVisibilityFor(dto.component.kind, dto.component.visibleOn);
    this.showcases.refuseOn(dto.component.kind, dto.component);
    // A kind created bare opens with what it cannot be without — a form's first fields.
    const items = this.rules.checkedItems(dto.component.kind, dto.component.items ?? openingItemsOf(dto.component.kind));
    const showcase =
      dto.component.kind === 'PRODUCTS' ? await this.showcases.forCreate(storeId, dto.component, items) : null;

    // Where the panel's "+" was pressed, or last without one — a band that put itself at the top
    // unasked would rearrange a page the shopkeeper had already arranged. Under the shop's lock, so
    // two adds at once cannot both read the same list and land on one number.
    const row = await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const bands = await tx.storeSection.findMany({
        where: { storeId },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true, position: true },
      });
      const { at, moves } = placedAt(bands, dto.position);

      for (const move of moves) {
        await tx.storeSection.update({ where: { id: move.id }, data: { position: move.position } });
      }

      return tx.storeSection.create({
        data: {
          storeId,
          name: dto.name ?? null,
          ...(dto.width !== undefined ? { width: dto.width } : {}),
          background: dto.background ?? null,
          position: at,
          isActive: dto.isActive ?? true,
          components: { create: componentRow(storeId, dto.component, items, 0, showcase) },
        },
        include: sectionInclude,
      });
    });

    return toSection(row);
  }

  /** A patch of a band's own attributes. A key left out is a column left alone. */
  async updateSection(
    storeSlug: string,
    userId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ): Promise<Section> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.rules.ownedSection(storeId, sectionId);

    const row = await this.prisma.storeSection.update({
      where: { id: sectionId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.width !== undefined ? { width: dto.width } : {}),
        // Null is a value here and not an omission: it is how a shopkeeper takes a colour back off
        // a band, and `?? null` would make "leave it alone" and "clear it" the same request.
        ...(dto.background !== undefined ? { background: dto.background } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: sectionInclude,
    });

    return toSection(row);
  }

  /**
   * The band and everything in it. The pictures it used are not deleted.
   *
   * Unless "everything in it" includes the product list: then the band stays, and the answer says
   * to hide it. A shop lost its shelves through this door before the check existed.
   */
  async removeSection(storeSlug: string, userId: string, sectionId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    // The check and the delete in one transaction, behind the shop's lock: see `PageRules.lockShop`.
    await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      await this.rules.ownedSection(storeId, sectionId, tx);
      await this.rules.refuseHoldingRequired(storeId, sectionId, tx);
      await tx.storeSection.delete({ where: { id: sectionId } });
    });
  }

  /**
   * The whole list of bands, in the new order, or nothing.
   *
   * Copied in shape from the catalogue's reorder, and for the same reason: a partial list is a list
   * whose missing rows keep positions that now collide, and the page they draw is neither the old
   * order nor the new one.
   */
  async reorderSections(storeSlug: string, userId: string, dto: ReorderDto): Promise<Section[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    // Under the shop's lock, the list read inside it: an add renumbers these same rows, and a reorder
    // racing it would leave two bands on one number, or deadlock on the rows each holds.
    await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const owned = await tx.storeSection.findMany({ where: { storeId }, select: { id: true } });
      this.rules.refuseOrderMismatch(dto.ids, owned, 'Send every band of this shop exactly once, in the new order');

      for (const [position, id] of dto.ids.entries()) {
        await tx.storeSection.update({ where: { id }, data: { position } });
      }
    });

    return pageOf(this.prisma, storeId);
  }

  /**
   * A copy of a band and of every block in it, right after it, hidden: the shop does not change
   * until the owner publishes the draft that shows it. Each block keeps whether it shows; the band's
   * hiding is what holds the copy back.
   *
   * No name: a site's menu is made of the named bands, and two with one name are one link twice.
   * Under the shop's lock, as an add is. A band holding the strip is refused: the strip is one per shop.
   */
  async duplicateSection(storeSlug: string, userId: string, sectionId: string): Promise<Section> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      await this.rules.ownedSection(storeId, sectionId, tx);

      const original = await tx.storeSection.findUniqueOrThrow({ where: { id: sectionId }, include: sectionInclude });
      this.rules.refuseCopy(original.components.map((component) => component.kind));

      const bands = await tx.storeSection.findMany({
        where: { storeId },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true, position: true },
      });
      const { at, moves } = placedAt(bands, bands.findIndex((band) => band.id === sectionId) + 1);

      for (const move of moves) {
        await tx.storeSection.update({ where: { id: move.id }, data: { position: move.position } });
      }

      return tx.storeSection.create({
        data: {
          storeId,
          name: null,
          width: original.width,
          background: original.background,
          position: at,
          isActive: false,
          components: { create: original.components.map((component, index) => copiedRow(component, index)) },
        },
        include: sectionInclude,
      });
    });

    return toSection(row);
  }
}
