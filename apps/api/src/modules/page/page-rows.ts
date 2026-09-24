// Types
import type { ComponentDto, UpdateComponentDto } from './dto/page.dto.js';

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
 * can safely become the kind's opening value.
 */
export function componentRow(storeId: string, dto: ComponentDto, items: object[], position: number) {
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
    items,
    position,
    isActive: dto.isActive ?? true,
  };
}

/** A patch of one component, as the update writes it. A key left out is a column left alone. */
export function componentPatch(dto: UpdateComponentDto, items: object[] | undefined) {
  return {
    ...(dto.title !== undefined ? { title: dto.title } : {}),
    ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
    ...(dto.body !== undefined ? { body: dto.body } : {}),
    ...(dto.span !== undefined ? { span: dto.span } : {}),
    ...(dto.display !== undefined ? { display: dto.display } : {}),
    ...(dto.columns !== undefined ? { columns: dto.columns } : {}),
    ...(dto.align !== undefined ? { align: dto.align } : {}),
    ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    // The whole list or nothing. Slides have an order, so a patch of one would leave the API
    // guessing where it goes — and leaving this line out of the update is what once made a
    // save answer 200 and change nothing at all.
    ...(items === undefined ? {} : { items }),
  };
}
