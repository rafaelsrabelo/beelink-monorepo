// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { StoreComponent } from '@harness-monorepo/contracts';
import type { AddComponentDto, UpdateComponentDto } from './dto/page.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { toComponent } from './page.mapper.js';
import { touchDraft } from './page-draft-revision.js';
import { refuseOnLanding } from './page-scope.js';
import { PageRules, pageError } from './page.rules.js';
import { componentPatch, componentRow, placedAt } from './page-rows.js';
import { ShowcaseRules } from './showcase.rules.js';
import { FeaturedRules } from './featured.rules.js';
import { openingItemsOf } from './page-seed.js';

/**
 * The blocks of a page: what each says. Where each sits is `PageComponentMovesService`'s.
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
    private readonly featured: FeaturedRules,
  ) {}

  async createComponent(
    storeSlug: string,
    userId: string,
    sectionId: string,
    dto: AddComponentDto,
    revision?: number,
  ): Promise<StoreComponent> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const { pageId, pageKind } = await this.rules.ownedSection(storeId, sectionId);
    refuseOnLanding(pageKind, dto.kind);
    await this.rules.refuseSecond(storeId, dto.kind);
    this.rules.refuseDisplayFor(dto.kind, dto.display);
    this.rules.refuseVisibilityFor(dto.kind, dto.visibleOn);
    this.showcases.refuseOn(dto.kind, dto);

    const checked = this.rules.checkedItems(dto.kind, dto.items ?? openingItemsOf(dto.kind));
    const items = await this.featured.itemsFor(dto.kind, storeId, checked);
    const showcase = dto.kind === 'PRODUCTS' ? await this.showcases.forCreate(storeId, dto, items) : null;
    const { position, ...fields } = dto;

    // Where the band's "+" was pressed, or last in the band without one.
    const row = await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      await touchDraft(tx, pageId, revision);
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
    revision?: number,
  ): Promise<StoreComponent> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.rules.ownedComponent(storeId, componentId);

    if (dto.kind !== undefined && dto.kind !== current.kind) {
      throw new BadRequestException(
        pageError('COMPONENT_KIND_IMMUTABLE', 'Um componente não muda de tipo. Apague e crie outro.'),
      );
    }

    this.rules.refuseDisplayFor(current.kind, dto.display);
    this.rules.refuseVisibilityFor(current.kind, dto.visibleOn);
    this.showcases.refuseOn(current.kind, dto);

    const items =
      dto.items === undefined ? undefined : await this.featured.itemsFor(current.kind, storeId, this.rules.checkedItems(current.kind, dto.items));
    const showcase =
      current.kind === 'PRODUCTS' ? await this.showcases.forUpdate(storeId, componentId, dto, items) : null;

    const row = await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      await touchDraft(tx, current.pageId, revision);
      return tx.storeComponent.update({ where: { id: componentId }, data: componentPatch(dto, items, showcase) });
    });

    return toComponent(row);
  }

  async removeComponent(storeSlug: string, userId: string, componentId: string, revision?: number): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    await this.prisma.$transaction(async (tx) => {
      await this.rules.lockShop(tx, storeId);
      const current = await this.rules.ownedComponent(storeId, componentId, tx);
      await touchDraft(tx, current.pageId, revision);
      // The home's last product list, only: a landing's showcases go with the landing.
      if (current.pageKind === 'HOME') await this.rules.refuseRequired(storeId, current.kind, tx);
      await tx.storeComponent.delete({ where: { id: componentId } });
    });
  }
}
