// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type {
  ComponentDisplay,
  ComponentKind,
  PageErrorCode,
} from '@harness-monorepo/contracts';

import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { componentItemsFor } from './component-items.schema.js';
import {
  DISPLAYS_OF_KIND,
  REQUIRED_COMPONENT_KINDS,
  SINGLETON_COMPONENT_KINDS,
} from './page.constants.js';

/** Any version: the ids are uuid v7, and the check is only that Postgres could read one. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The client a rule reads through: the injected one, or a transaction's. */
type Db = Prisma.TransactionClient;

/** Keeps every code this module answers inside the contract's union. */
export function pageError(errorCode: PageErrorCode, message: string): { errorCode: PageErrorCode; message: string } {
  return { errorCode, message };
}

/**
 * What the page module refuses, stated apart from what it writes.
 *
 * Its own class because the service that held these had passed the line limit, and the seam falls
 * here: the service knows the order of a write, and this knows the reasons a write is refused.
 * Every method throws the module's own `errorCode` or returns what the caller needs to go on.
 */
@Injectable()
export class PageRules {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The order sent has to be every row of this list, exactly once.
   *
   * Shared by both levels because the failure is the same at both: a list missing a row leaves that
   * row holding a position the others have just taken, and the page that draws is neither order.
   */
  refuseOrderMismatch(ids: readonly string[], owned: readonly { id: string }[], message: string): void {
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
   * shopkeeper can delete, which is why it is not worth a lock. That sentence stays true for the
   * product list because `refuseRequired` guards the LAST one and never a duplicate.
   */
  async refuseSecond(storeId: string, kind: ComponentKind): Promise<void> {
    if (!(SINGLETON_COMPONENT_KINDS as readonly ComponentKind[]).includes(kind)) return;

    const existing = await this.prisma.storeComponent.findFirst({ where: { storeId, kind }, select: { id: true } });

    if (existing) {
      throw new ConflictException(
        pageError('COMPONENT_KIND_SINGLETON', 'Esta loja já tem um componente deste tipo.'),
      );
    }
  }

  /**
   * One write of this kind at a time for a shop, until the transaction it is called in ends.
   *
   * The "last one" rules below are a count and then a delete, and those are only a guarantee
   * together: two tabs deleting a shop's last two showcases each counted two, each deleted one, and
   * the shop was left with none. Locking the shop's own row makes the second delete wait, and count
   * one.
   */
  async lockShop(db: Db, storeId: string): Promise<void> {
    await db.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;
  }

  /**
   * The shop's last product list is not deleted; it is hidden.
   *
   * Stated here and not only in the panel, because the panel is not the lock: it already drew no
   * bin on the product list's own row, and the shelves were deleted anyway — through the bin on
   * the section holding them. The two checks below are the same rule at the two levels.
   *
   * The LAST one, and not every one. `refuseSecond` is a read-then-write that a double-click can
   * beat, and a duplicate it lets through must stay deletable, or the shop is stuck with two
   * shelves and no way back but the database.
   */
  async refuseRequired(storeId: string, kind: ComponentKind, db: Db = this.prisma): Promise<void> {
    if (!(REQUIRED_COMPONENT_KINDS as readonly ComponentKind[]).includes(kind)) return;

    const inShop = await db.storeComponent.count({ where: { storeId, kind } });

    if (inShop <= 1) {
      throw new BadRequestException(
        pageError('COMPONENT_REQUIRED', 'A lista de produtos não pode ser apagada. Esconda a faixa.'),
      );
    }
  }

  async refuseHoldingRequired(storeId: string, sectionId: string, db: Db = this.prisma): Promise<void> {
    const required = { in: [...REQUIRED_COMPONENT_KINDS] };
    const held = await db.storeComponent.count({ where: { sectionId, kind: required } });

    if (held === 0) return;

    const elsewhere = await db.storeComponent.count({
      where: { storeId, kind: required, sectionId: { not: sectionId } },
    });

    if (elsewhere === 0) {
      throw new BadRequestException(
        pageError('COMPONENT_REQUIRED', 'Esta faixa tem a lista de produtos, que não pode ser apagada. Esconda a faixa.'),
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
  checkedItems(kind: ComponentKind, items: unknown): object[] {
    const parsed = componentItemsFor(kind).safeParse(items ?? []);

    if (!parsed.success) {
      throw new BadRequestException(
        pageError('COMPONENT_ITEMS_INVALID', parsed.error.issues[0]?.message ?? 'Conteúdo do bloco inválido'),
      );
    }

    return parsed.data as object[];
  }

  /**
   * A display only from the two its kind draws, and never taken back to null there.
   *
   * A value on a kind that draws none would be stored for nobody; one its kind does not draw — a
   * banner as a rail, a showcase as a carousel — would be a choice the page cannot honour; and null
   * on a kind that draws one would undo the choice every row of it has had since its migration.
   */
  refuseDisplayFor(kind: ComponentKind, display: ComponentDisplay | null | undefined): void {
    if (display === undefined) return;

    const drawn = DISPLAYS_OF_KIND[kind];

    if (!drawn && display !== null) {
      throw new BadRequestException(
        pageError('COMPONENT_DISPLAY_INVALID', 'Só um banner e uma vitrine escolhem como mostrar o que têm.'),
      );
    }

    if (drawn && (display === null || !drawn.includes(display))) {
      throw new BadRequestException(
        pageError('COMPONENT_DISPLAY_INVALID', `Este bloco é ${drawn.join(' ou ')}.`),
      );
    }
  }

  /** A band that exists but belongs to another shop answers 404: this shop does not have one. */
  async ownedSection(storeId: string, sectionId: string, db: Db = this.prisma): Promise<void> {
    // An id that is not a uuid cannot name a row, and Postgres answers one in a uuid column with an
    // error that left as a 500. It is the same answer as a band that is not here.
    if (!UUID.test(sectionId)) {
      throw new NotFoundException(pageError('SECTION_NOT_FOUND', `No band ${sectionId} in this shop`));
    }

    const row = await db.storeSection.findUnique({
      where: { id: sectionId },
      select: { storeId: true },
    });

    if (!row || row.storeId !== storeId) {
      throw new NotFoundException(pageError('SECTION_NOT_FOUND', `No band ${sectionId} in this shop`));
    }
  }

  /** Returns what it found, so a caller that has to reason about it needs no second read. */
  async ownedComponent(storeId: string, componentId: string, db: Db = this.prisma): Promise<{ kind: ComponentKind }> {
    if (!UUID.test(componentId)) {
      throw new NotFoundException(pageError('COMPONENT_NOT_FOUND', `No component ${componentId} in this shop`));
    }

    const row = await db.storeComponent.findUnique({
      where: { id: componentId },
      select: { storeId: true, kind: true },
    });

    if (!row || row.storeId !== storeId) {
      throw new NotFoundException(pageError('COMPONENT_NOT_FOUND', `No component ${componentId} in this shop`));
    }

    return { kind: row.kind };
  }
}
