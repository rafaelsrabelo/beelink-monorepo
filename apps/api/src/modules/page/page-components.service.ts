// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { Section, StoreComponent } from '@harness-monorepo/contracts';
import type { AddComponentDto, UpdateComponentDto } from './dto/page.dto.js';
import type { MoveComponentDto } from './dto/move-component.dto.js';
import type { ReorderDto } from '../catalog/dto/reorder.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { toComponent } from './page.mapper.js';
import { pageOf } from './page-read.js';
import { PageRules, pageError } from './page.rules.js';
import { closedUp, componentPatch, componentRow, copiedRow, placedAt } from './page-rows.js';
import { ShowcaseRules } from './showcase.rules.js';
import { openingItemsOf } from './page-seed.js';

/**
 * The blocks of the landing page: what each says, where it sits in its band, and which band.
 *
 * Apart from `PageService`, which keeps the bands, because the two had grown past one file and the
 * seam falls between the levels. Both ask the same question first — does this person own this shop
 * — through `StoresService` and `PageRules`, so the split costs no second ownership check.
 */
@Injectable()
export class PageComponentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly rules: PageRules,
    private readonly showcases: ShowcaseRules,
  ) {}

  async createComponent(
    storeSlug: string,
    userId: string,
    sectionId: string,
    dto: AddComponentDto,
  ): Promise<StoreComponent> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.rules.ownedSection(storeId, sectionId);
    await this.rules.refuseSecond(storeId, dto.kind);
    this.rules.refuseDisplayFor(dto.kind, dto.display);
    this.showcases.refuseOn(dto.kind, dto);

    const items = this.rules.checkedItems(dto.kind, dto.items ?? openingItemsOf(dto.kind));
    const showcase = dto.kind === 'PRODUCTS' ? await this.showcases.forCreate(storeId, dto, items) : null;
    const { position, ...fields } = dto;

    // Where the band's "+" was pressed, or last in the band without one.
    const row = await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const inBand = await tx.storeComponent.findMany({
        where: { sectionId },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true, position: true },
      });
      const { at, moves } = placedAt(inBand, position);

      for (const move of moves) {
        await tx.storeComponent.update({ where: { id: move.id }, data: { position: move.position } });
      }

      return tx.storeComponent.create({ data: { sectionId, ...componentRow(storeId, fields, items, at, showcase) } });
    });

    return toComponent(row);
  }

  /**
   * A patch of one component.
   *
   * `kind` is not patchable, and that is the simplification this model bought. It used to be, so a
   * banner could move between the top of the page and its body — a position expressed as a type.
   * Where a thing sits is its band's business now, so the only reason to change a kind was one
   * that no longer exists, and every remaining change of kind is a different shape with different
   * fields. Sent unchanged it rides along harmlessly; sent changed it is refused.
   */
  async updateComponent(
    storeSlug: string,
    userId: string,
    componentId: string,
    dto: UpdateComponentDto,
  ): Promise<StoreComponent> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.rules.ownedComponent(storeId, componentId);

    if (dto.kind !== undefined && dto.kind !== current.kind) {
      throw new BadRequestException(
        pageError('COMPONENT_KIND_IMMUTABLE', 'Um componente não muda de tipo. Apague e crie outro.'),
      );
    }

    this.rules.refuseDisplayFor(current.kind, dto.display);
    this.showcases.refuseOn(current.kind, dto);

    const items = dto.items === undefined ? undefined : this.rules.checkedItems(current.kind, dto.items);
    const showcase =
      current.kind === 'PRODUCTS' ? await this.showcases.forUpdate(storeId, componentId, dto, items) : null;

    const row = await this.prisma.storeComponent.update({
      where: { id: componentId },
      data: componentPatch(dto, items, showcase),
    });

    return toComponent(row);
  }

  async removeComponent(storeSlug: string, userId: string, componentId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const current = await this.rules.ownedComponent(storeId, componentId, tx);
      await this.rules.refuseRequired(storeId, current.kind, tx);
      await tx.storeComponent.delete({ where: { id: componentId } });
    });
  }

  /** The components of one band, in the new order. The band itself does not move. */
  async reorderComponents(
    storeSlug: string,
    userId: string,
    sectionId: string,
    dto: ReorderDto,
  ): Promise<Section[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.rules.ownedSection(storeId, sectionId);

    // The same lock an add into this band takes: see reorderSections.
    await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const owned = await tx.storeComponent.findMany({ where: { sectionId }, select: { id: true } });
      this.rules.refuseOrderMismatch(dto.ids, owned, 'Send every component of this band exactly once, in the new order');

      for (const [position, id] of dto.ids.entries()) {
        await tx.storeComponent.update({ where: { id }, data: { position } });
      }
    });

    return pageOf(this.prisma, storeId);
  }

  /**
   * A component into another band, or to another place in its own — how two blocks stacked in two
   * bands end up side by side, without being made again.
   *
   * Both bands in one transaction, under the shop's lock: the band it joins makes room, and the band
   * it leaves closes up behind it — or is deleted, when that left it empty, since a band never exists
   * empty. Answered with the whole page, because two bands changed and one of them may be gone.
   */
  async moveComponent(
    storeSlug: string,
    userId: string,
    componentId: string,
    dto: MoveComponentDto,
  ): Promise<Section[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const moving = await this.rules.ownedComponent(storeId, componentId, tx);
      await this.rules.ownedSection(storeId, dto.sectionId, tx);

      // Without the one moving, so its own band reorders it like any other.
      const othersIn = (sectionId: string) =>
        tx.storeComponent.findMany({
          where: { sectionId, id: { not: componentId } },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: { id: true, position: true, kind: true },
        });
      const joined = await othersIn(dto.sectionId);
      this.rules.refuseMove(moving.kind, joined);

      const { at, moves } = placedAt(joined, dto.position);

      for (const move of moves) {
        await tx.storeComponent.update({ where: { id: move.id }, data: { position: move.position } });
      }

      await tx.storeComponent.update({
        where: { id: componentId },
        data: { sectionId: dto.sectionId, position: at, ...(dto.span !== undefined ? { span: dto.span } : {}) },
      });

      if (moving.sectionId === dto.sectionId) return;

      const left = await othersIn(moving.sectionId);

      // After the component has left, never before: deleting a band cascades to what it still holds.
      if (left.length === 0) {
        await tx.storeSection.delete({ where: { id: moving.sectionId } });
        return;
      }

      for (const move of closedUp(left)) {
        await tx.storeComponent.update({ where: { id: move.id }, data: { position: move.position } });
      }
    });

    return pageOf(this.prisma, storeId);
  }

  /**
   * A copy of one block, right after it in its band, hidden: the shop does not change until the
   * owner publishes the draft that shows it. Every column is copied; its items get ids of their own.
   *
   * Under the shop's lock, as an add is: the blocks after it move down one. The strip is one per
   * shop, and a second is refused as creating one would be.
   */
  async duplicateComponent(storeSlug: string, userId: string, componentId: string): Promise<StoreComponent> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const current = await this.rules.ownedComponent(storeId, componentId, tx);
      this.rules.refuseCopy([current.kind]);

      const original = await tx.storeComponent.findUniqueOrThrow({ where: { id: componentId } });
      const inBand = await tx.storeComponent.findMany({
        where: { sectionId: original.sectionId },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true, position: true },
      });
      const { at, moves } = placedAt(inBand, inBand.findIndex((sibling) => sibling.id === componentId) + 1);

      for (const move of moves) {
        await tx.storeComponent.update({ where: { id: move.id }, data: { position: move.position } });
      }

      return tx.storeComponent.create({
        data: { sectionId: original.sectionId, ...copiedRow(original, at), isActive: false },
      });
    });

    return toComponent(row);
  }

}
