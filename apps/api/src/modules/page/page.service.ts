// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { ComponentKind, PageErrorCode, Section, StoreComponent } from '@harness-monorepo/contracts';
import type { ComponentDto, CreateSectionDto, UpdateComponentDto, UpdateSectionDto } from './dto/page.dto.js';
import type { ReorderDto } from '../catalog/dto/reorder.dto.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { componentItemsFor } from './component-items.schema.js';
import { SINGLETON_COMPONENT_KINDS } from './page.constants.js';
import { sectionInclude, toComponent, toSection } from './page.mapper.js';

/** Keeps every code this module answers inside the contract's union. */
function pageError(errorCode: PageErrorCode, message: string): { errorCode: PageErrorCode; message: string } {
  return { errorCode, message };
}

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

    await this.refuseSecond(storeId, dto.component.kind);
    const items = this.checkedItems(dto.component.kind, dto.component.items);

    // Last, the way a new category lands last. A band that inserted itself at the top would
    // rearrange a page the shopkeeper had already arranged.
    const last = await this.prisma.storeSection.aggregate({ where: { storeId }, _max: { position: true } });

    const row = await this.prisma.storeSection.create({
      data: {
        storeId,
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
    await this.ownedSection(storeId, sectionId);

    const row = await this.prisma.storeSection.update({
      where: { id: sectionId },
      data: {
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

  /** The band and everything in it. The pictures it used are not deleted. */
  async removeSection(storeSlug: string, userId: string, sectionId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.ownedSection(storeId, sectionId);

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

    this.refuseOrderMismatch(dto.ids, owned, 'Send every band of this shop exactly once, in the new order');

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
    await this.ownedSection(storeId, sectionId);
    await this.refuseSecond(storeId, dto.kind);

    const items = this.checkedItems(dto.kind, dto.items);
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
    const current = await this.ownedComponent(storeId, componentId);

    if (dto.kind !== undefined && dto.kind !== current.kind) {
      throw new BadRequestException(
        pageError('COMPONENT_KIND_IMMUTABLE', 'Um componente não muda de tipo. Apague e crie outro.'),
      );
    }

    const items = dto.items === undefined ? undefined : this.checkedItems(current.kind, dto.items);

    const row = await this.prisma.storeComponent.update({
      where: { id: componentId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.layout !== undefined ? { layout: dto.layout } : {}),
        ...(dto.columns !== undefined ? { columns: dto.columns } : {}),
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
    await this.ownedComponent(storeId, componentId);

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
    await this.ownedSection(storeId, sectionId);

    const owned = await this.prisma.storeComponent.findMany({ where: { sectionId }, select: { id: true } });

    this.refuseOrderMismatch(dto.ids, owned, 'Send every component of this band exactly once, in the new order');

    await this.prisma.$transaction(
      dto.ids.map((id, position) => this.prisma.storeComponent.update({ where: { id }, data: { position } })),
    );

    return this.list(storeSlug, userId);
  }

  /**
   * The order sent has to be every row of this list, exactly once.
   *
   * Shared by both levels because the failure is the same at both: a list missing a row leaves that
   * row holding a position the others have just taken, and the page that draws is neither order.
   */
  private refuseOrderMismatch(ids: readonly string[], owned: readonly { id: string }[], message: string): void {
    const sent = new Set(ids);

    if (sent.size !== ids.length || sent.size !== owned.length || !owned.every((row) => sent.has(row.id))) {
      throw new ConflictException(pageError('REORDER_MISMATCH', message));
    }
  }

  /**
   * The kinds a shop may only have one of, refused before a second is written.
   *
   * The database cannot say this: the constraint is one per SHOP and the rows live under bands, so
   * a unique index would have to span the join. It is a read and then a write, which races with
   * itself under a double-click — and the cost of losing that race is a duplicate row the
   * shopkeeper can delete, which is why it is not worth a lock.
   */
  private async refuseSecond(storeId: string, kind: ComponentKind): Promise<void> {
    if (!(SINGLETON_COMPONENT_KINDS as readonly ComponentKind[]).includes(kind)) return;

    const existing = await this.prisma.storeComponent.findFirst({ where: { storeId, kind }, select: { id: true } });

    if (existing) {
      throw new ConflictException(
        pageError('COMPONENT_KIND_SINGLETON', 'Esta loja já tem um componente deste tipo.'),
      );
    }
  }

  /**
   * The items, checked against the shape this kind allows.
   *
   * `@IsArray()` on the DTO proves only that it is a list; what is inside depends on the kind, and
   * a discriminated union is what states that once. Without this call the union was a validator
   * nobody ran — the same "declared and never read" that sixteen `layoutSettings` keys already
   * are, and the reason a slide with no picture would have reached the database.
   */
  private checkedItems(kind: ComponentKind, items: unknown): object[] {
    const parsed = componentItemsFor(kind).safeParse(items ?? []);

    if (!parsed.success) {
      throw new BadRequestException(
        pageError('COMPONENT_ITEMS_INVALID', parsed.error.issues[0]?.message ?? 'Conteúdo do bloco inválido'),
      );
    }

    return parsed.data as object[];
  }

  /** A band that exists but belongs to another shop answers 404: this shop does not have one. */
  private async ownedSection(storeId: string, sectionId: string): Promise<void> {
    const row = await this.prisma.storeSection.findUnique({
      where: { id: sectionId },
      select: { storeId: true },
    });

    if (!row || row.storeId !== storeId) {
      throw new NotFoundException(pageError('SECTION_NOT_FOUND', `No band ${sectionId} in this shop`));
    }
  }

  /** Returns the kind it found, so a caller that has to reason about it needs no second read. */
  private async ownedComponent(storeId: string, componentId: string): Promise<{ kind: ComponentKind }> {
    const row = await this.prisma.storeComponent.findUnique({
      where: { id: componentId },
      select: { storeId: true, kind: true },
    });

    if (!row || row.storeId !== storeId) {
      throw new NotFoundException(pageError('COMPONENT_NOT_FOUND', `No component ${componentId} in this shop`));
    }

    return { kind: row.kind };
  }
}
