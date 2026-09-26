// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { Section, StoreComponent } from '@harness-monorepo/contracts';
import type { MoveComponentDto } from './dto/move-component.dto.js';
import type { ReorderDto } from '../catalog/dto/reorder.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { toComponent } from './page.mapper.js';
import { pageOf } from './page-read.js';
import { touchDraft } from './page-draft-revision.js';
import { refuseOtherPage } from './page-scope.js';
import { PageRules } from './page.rules.js';
import { closedUp, copiedRow, placedAt } from './page-rows.js';

/**
 * Where a block sits: its order in its band, the band it moves to, and the copy placed after it.
 * Apart from `PageComponentsService`, which keeps what a block says, because that file had reached
 * the line limit and the seam falls between a block's content and its place.
 */
@Injectable()
export class PageComponentMovesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly rules: PageRules,
  ) {}

  /** The components of one band, in the new order. The band itself does not move. */
  async reorderComponents(
    storeSlug: string,
    userId: string,
    sectionId: string,
    dto: ReorderDto,
    revision?: number,
  ): Promise<Section[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { pageId } = await this.rules.ownedSection(storeId, sectionId);

    // The same lock an add into this band takes: see reorderSections.
    await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      await touchDraft(tx, pageId, revision);
      const owned = await tx.storeComponent.findMany({ where: { sectionId }, select: { id: true } });
      this.rules.refuseOrderMismatch(dto.ids, owned, 'Send every component of this band exactly once, in the new order');

      for (const [position, id] of dto.ids.entries()) {
        await tx.storeComponent.update({ where: { id }, data: { position } });
      }
    });

    return pageOf(this.prisma, pageId);
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
    revision?: number,
  ): Promise<Section[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const pageId = await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const moving = await this.rules.ownedComponent(storeId, componentId, tx);
      refuseOtherPage(moving.pageId, await this.rules.ownedSection(storeId, dto.sectionId, tx), dto.sectionId);
      await touchDraft(tx, moving.pageId, revision);

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

      if (moving.sectionId === dto.sectionId) return moving.pageId;

      const left = await othersIn(moving.sectionId);

      // After the component has left, never before: deleting a band cascades to what it still holds.
      if (left.length === 0) {
        await tx.storeSection.delete({ where: { id: moving.sectionId } });
        return moving.pageId;
      }

      for (const move of closedUp(left)) {
        await tx.storeComponent.update({ where: { id: move.id }, data: { position: move.position } });
      }

      return moving.pageId;
    });

    return pageOf(this.prisma, pageId);
  }

  /**
   * A copy of one block, right after it in its band, hidden: the shop does not change until the
   * owner publishes the draft that shows it. Every column is copied; its items get ids of their own.
   *
   * Under the shop's lock, as an add is: the blocks after it move down one. The strip is one per
   * shop, and a second is refused as creating one would be.
   */
  async duplicateComponent(storeSlug: string, userId: string, componentId: string, revision?: number): Promise<StoreComponent> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const current = await this.rules.ownedComponent(storeId, componentId, tx);
      await touchDraft(tx, current.pageId, revision);
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
