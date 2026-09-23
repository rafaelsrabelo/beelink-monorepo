// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { Section, StoreComponent } from '@harness-monorepo/contracts';
import type { ComponentDto, CreateSectionDto, UpdateComponentDto, UpdateSectionDto } from './dto/page.dto.js';
import type { ReorderDto } from '../catalog/dto/reorder.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { sectionInclude, toComponent, toSection } from './page.mapper.js';
import { PageRules, pageError } from './page.rules.js';

/**
 * The landing page, at both of its levels.
 *
 * One service and not two, because every write at either level starts with the same question —
 * does this person own this shop — and because a band and what is in it are created together. Two
 * services would have meant one calling the other for ownership, which is one indirection standing
 * in for a shared sentence.
 */
@Injectable()
export class PageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly rules: PageRules,
  ) {}

  /** The panel's read: hidden bands and hidden components included, in the arranged order. */
  async list(storeSlug: string, userId: string): Promise<Section[]> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const rows = await this.prisma.storeSection.findMany({
      where: { storeId },
      include: sectionInclude,
      orderBy: { position: 'asc' },
    });

    return rows.map(toSection);
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
    const items = this.rules.checkedItems(dto.component.kind, dto.component.items);

    // Last, the way a new category lands last. A band that inserted itself at the top would
    // rearrange a page the shopkeeper had already arranged.
    const last = await this.prisma.storeSection.aggregate({ where: { storeId }, _max: { position: true } });

    const row = await this.prisma.storeSection.create({
      data: {
        storeId,
        name: dto.name ?? null,
        ...(dto.width !== undefined ? { width: dto.width } : {}),
        background: dto.background ?? null,
        position: (last._max.position ?? -1) + 1,
        isActive: dto.isActive ?? true,
        components: {
          create: {
            storeId,
            kind: dto.component.kind,
            title: dto.component.title ?? null,
            subtitle: dto.component.subtitle ?? null,
            body: dto.component.body ?? null,
            ...(dto.component.layout !== undefined ? { layout: dto.component.layout } : {}),
            columns: dto.component.columns ?? null,
            align: dto.component.align ?? null,
            items,
            position: 0,
            isActive: dto.component.isActive ?? true,
          },
        },
      },
      include: sectionInclude,
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
    await this.rules.ownedSection(storeId, sectionId);
    await this.rules.refuseHoldingRequired(storeId, sectionId);

    await this.prisma.storeSection.delete({ where: { id: sectionId } });
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
    const owned = await this.prisma.storeSection.findMany({ where: { storeId }, select: { id: true } });

    this.rules.refuseOrderMismatch(dto.ids, owned, 'Send every band of this shop exactly once, in the new order');

    await this.prisma.$transaction(
      dto.ids.map((id, position) => this.prisma.storeSection.update({ where: { id }, data: { position } })),
    );

    return this.list(storeSlug, userId);
  }

  async createComponent(
    storeSlug: string,
    userId: string,
    sectionId: string,
    dto: ComponentDto,
  ): Promise<StoreComponent> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.rules.ownedSection(storeId, sectionId);
    await this.rules.refuseSecond(storeId, dto.kind);

    const items = this.rules.checkedItems(dto.kind, dto.items);
    const last = await this.prisma.storeComponent.aggregate({
      where: { sectionId },
      _max: { position: true },
    });

    const row = await this.prisma.storeComponent.create({
      data: {
        sectionId,
        storeId,
        kind: dto.kind,
        title: dto.title ?? null,
        subtitle: dto.subtitle ?? null,
        body: dto.body ?? null,
        ...(dto.layout !== undefined ? { layout: dto.layout } : {}),
        columns: dto.columns ?? null,
        align: dto.align ?? null,
        items,
        position: (last._max.position ?? -1) + 1,
        isActive: dto.isActive ?? true,
      },
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

    const items = dto.items === undefined ? undefined : this.rules.checkedItems(current.kind, dto.items);

    const row = await this.prisma.storeComponent.update({
      where: { id: componentId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.layout !== undefined ? { layout: dto.layout } : {}),
        ...(dto.columns !== undefined ? { columns: dto.columns } : {}),
        ...(dto.align !== undefined ? { align: dto.align } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        // The whole list or nothing. Slides have an order, so a patch of one would leave the API
        // guessing where it goes — and leaving this line out of the update is what once made a
        // save answer 200 and change nothing at all.
        ...(items === undefined ? {} : { items }),
      },
    });

    return toComponent(row);
  }

  async removeComponent(storeSlug: string, userId: string, componentId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.rules.ownedComponent(storeId, componentId);
    await this.rules.refuseRequired(storeId, current.kind);

    await this.prisma.storeComponent.delete({ where: { id: componentId } });
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

    const owned = await this.prisma.storeComponent.findMany({ where: { sectionId }, select: { id: true } });

    this.rules.refuseOrderMismatch(dto.ids, owned, 'Send every component of this band exactly once, in the new order');

    await this.prisma.$transaction(
      dto.ids.map((id, position) => this.prisma.storeComponent.update({ where: { id }, data: { position } })),
    );

    return this.list(storeSlug, userId);
  }
}
