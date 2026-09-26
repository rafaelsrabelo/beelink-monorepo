// Node
import { randomUUID } from 'node:crypto';

// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { StoreComponentModel } from '../../generated/prisma/models.js';
import type { ComponentDto, UpdateComponentDto } from './dto/page.dto.js';
import type { ShowcaseFields } from './showcase.rules.js';

// App
import { openingDisplayOf } from './page-seed.js';

/**
 * A component's row as both creates write it — around a new band, or into one that exists.
 *
 * One function, so the two paths cannot disagree about what "no subtitle" or "no columns" is
 * written as: they did, once, in the other direction — a spread that landed in create and not in
 * update is what made a save answer 200 and change nothing.
 *
 * `items` arrive already checked by `PageRules`, and so does `display`, which is why an absent one
 * can safely become the kind's opening value. A showcase's fields arrive normalized by
 * `ShowcaseRules`, its `items` among them.
 */
export function componentRow(
  storeId: string,
  dto: ComponentDto,
  items: object[],
  position: number,
  showcase: ShowcaseFields | null,
) {
  return {
    storeId,
    kind: dto.kind,
    title: dto.title ?? null,
    subtitle: dto.subtitle ?? null,
    body: dto.body ?? null,
    ...(dto.span !== undefined ? { span: dto.span } : {}),
    display: dto.display !== undefined ? dto.display : openingDisplayOf(dto.kind),
    columns: dto.columns ?? null,
    align: dto.align ?? null,
    ...(dto.visibleOn !== undefined ? { visibleOn: dto.visibleOn } : {}),
    ...(showcase ?? { items }),
    position,
    isActive: dto.isActive ?? true,
  };
}

/**
 * A patch of one component, as the update writes it. A key left out is a column left alone; a
 * showcase touched at all is written whole, as `ShowcaseRules` normalized it.
 */
export function componentPatch(dto: UpdateComponentDto, items: object[] | undefined, showcase: ShowcaseFields | null) {
  return {
    ...(dto.title !== undefined ? { title: dto.title } : {}),
    ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
    ...(dto.body !== undefined ? { body: dto.body } : {}),
    ...(dto.span !== undefined ? { span: dto.span } : {}),
    ...(dto.display !== undefined ? { display: dto.display } : {}),
    ...(dto.columns !== undefined ? { columns: dto.columns } : {}),
    ...(dto.align !== undefined ? { align: dto.align } : {}),
    ...(dto.visibleOn !== undefined ? { visibleOn: dto.visibleOn } : {}),
    ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    // The whole list or nothing. Slides have an order, so a patch of one would leave the API
    // guessing where it goes — and leaving this line out of the update is what once made a
    // save answer 200 and change nothing at all.
    ...(items === undefined ? {} : { items }),
    ...(showcase ?? {}),
  };
}

/**
 * Where a new row lands among the ones already in its list, and the rows that have to move for it.
 *
 * `position` is a place in the ordered list, not a value of the column: the column has gaps where
 * rows were deleted (0, 1, 3), and "put it second" means second whatever the numbers are. The list is
 * renumbered from 0 around the newcomer, and only the rows whose number changes are written.
 */
export function placedAt(
  rows: readonly { id: string; position: number }[],
  position: number | undefined,
): { at: number; moves: { id: string; position: number }[] } {
  const at = Math.min(position ?? rows.length, rows.length);
  const moves = rows.flatMap((row, index) => {
    const next = index < at ? index : index + 1;
    return row.position === next ? [] : [{ id: row.id, position: next }];
  });

  return { at, moves };
}

/**
 * The rows a list keeps after one of its own left it, renumbered from 0 so the gap closes. Only the
 * rows whose number changes are written, as in `placedAt`.
 */
export function closedUp(rows: readonly { id: string; position: number }[]): { id: string; position: number }[] {
  return rows.flatMap((row, index) => (row.position === index ? [] : [{ id: row.id, position: index }]));
}

/**
 * A component's row copied, for a duplicate: every column, at `position`, with fresh item ids.
 *
 * Fresh because an item's id is what the editor keys a slide or a field by, and a form's answers
 * name the field they answered; two blocks sharing ids would have one's edits land in the other's.
 * A product pick keeps its product — only the row's own id changes.
 */
export function copiedRow(row: StoreComponentModel, position: number) {
  const items = Array.isArray(row.items) ? row.items : [];

  return {
    storeId: row.storeId,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    span: row.span,
    display: row.display,
    source: row.source,
    sourceCategoryId: row.sourceCategoryId,
    limit: row.limit,
    columns: row.columns,
    align: row.align,
    visibleOn: row.visibleOn,
    items: items.map((item) =>
      item && typeof item === 'object' && !Array.isArray(item) && 'id' in item ? { ...item, id: randomUUID() } : item,
    ) as Prisma.InputJsonArray,
    position,
    isActive: row.isActive,
  };
}
