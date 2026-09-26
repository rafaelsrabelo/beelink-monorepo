// Types
import type { ComponentItem, ComponentKind, Section, StoreComponent } from '@harness-monorepo/contracts';
import type { StoreComponentModel, StoreSectionModel } from '../../generated/prisma/models.js';

// App
import { parseComponentItems } from './component-items.schema.js';

/**
 * A band is always read with what is in it, never on its own.
 *
 * Demanding the components in the row type is what stops a call site forgetting the include and
 * shipping a band that draws nothing — which, on the storefront, is an empty strip on a page a
 * stranger asked for rather than an error anybody would see.
 */
export type SectionRow = StoreSectionModel & { components: StoreComponentModel[] };

export const sectionInclude = {
  components: { orderBy: { position: 'asc' } },
} as const;

/**
 * What the database gave back for `items`, narrowed to what the wire declares.
 *
 * `Json` is `unknown` as far as the client is concerned, and casting it would be a lie the
 * compiler cannot check. A row whose items are not an array reads as none — which draws an empty
 * band rather than throwing. The shape inside each entry is the write path's job, and the zod
 * union there is where a malformed one is refused.
 */
export function itemsOf(kind: ComponentKind, raw: unknown): ComponentItem[] {
  return parseComponentItems(kind, raw);
}

export function toComponent(row: StoreComponentModel): StoreComponent {
  return {
    id: row.id,
    sectionId: row.sectionId,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    span: row.span,
    display: row.display,
    source: row.source,
    sourceCategoryId: row.sourceCategoryId,
    limit: row.limit,
    items: itemsOf(row.kind, row.items),
    columns: row.columns,
    align: row.align,
    visibleOn: row.visibleOn,
    position: row.position,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies StoreComponent;
}

export function toSection(row: SectionRow): Section {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    background: row.background,
    position: row.position,
    isActive: row.isActive,
    components: row.components.map(toComponent),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies Section;
}
