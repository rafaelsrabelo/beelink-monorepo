// Libs
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';

// Types
import type {
  ComponentDisplay,
  ComponentKind,
  ComponentSpan,
  DeviceVisibility,
  ProductSource,
  SectionWidth,
  TextAlign,
} from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import {
  COMPONENT_DISPLAYS,
  COMPONENT_KINDS,
  COMPONENT_SPANS,
  DEVICE_VISIBILITIES,
  PRODUCT_SOURCES,
  SECTION_WIDTHS,
  TEXT_ALIGNS,
} from './page.constants.js';

/*
  A published page, frozen: what `StorePageVersion.document` holds and what the shop is served from.

  The draft's rows and a version's document are read by the same mapper, so both are described here
  by the shapes that mapper needs — `SectionShape` and `ComponentShape` — which a Prisma row
  satisfies as it is and a document entry satisfies once it is read. Order is the array's: a
  document has no positions, and no ids of the shop or the band a block sits in.
*/

/** What the public mapper and the lookups read of a block, whether it came from a row or a document. */
export interface ComponentShape {
  id: string;
  kind: ComponentKind;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  span: ComponentSpan;
  display: ComponentDisplay | null;
  source: ProductSource | null;
  sourceCategoryId: string | null;
  limit: number | null;
  columns: number | null;
  align: TextAlign | null;
  visibleOn: DeviceVisibility;
  /** Raw: each kind's items are narrowed where they are read, by the forgiving `parseComponentItems`. */
  items: unknown;
  isActive: boolean;
}

/** What the public mapper and the lookups read of a band. */
export interface SectionShape {
  id: string;
  name: string | null;
  width: SectionWidth;
  background: string | null;
  isActive: boolean;
  components: readonly ComponentShape[];
}

const documentComponent = z.object({
  id: z.string().min(1),
  kind: z.enum(COMPONENT_KINDS),
  title: z.string().nullable(),
  subtitle: z.string().nullable(),
  body: z.string().nullable(),
  span: z.enum(COMPONENT_SPANS),
  display: z.enum(COMPONENT_DISPLAYS).nullable(),
  source: z.enum(PRODUCT_SOURCES).nullable(),
  sourceCategoryId: z.string().min(1).nullable(),
  limit: z.number().int().nullable(),
  columns: z.number().int().nullable(),
  align: z.enum(TEXT_ALIGNS).nullable(),
  visibleOn: z.enum(DEVICE_VISIBILITIES),
  items: z.array(z.unknown()),
  isActive: z.boolean(),
}) satisfies z.ZodType<ComponentShape>;

const documentSection = z.object({
  id: z.string().min(1),
  name: z.string().nullable(),
  width: z.enum(SECTION_WIDTHS),
  background: z.string().nullable(),
  isActive: z.boolean(),
  components: z.array(documentComponent),
}) satisfies z.ZodType<SectionShape>;

/**
 * `format` is the hook for the day the shape changes: a reader of format 2 upcasts a 1. It is not
 * called `version` so it is never read as the version's number.
 */
export const pageDocumentSchema = z.object({ format: z.literal(1), sections: z.array(documentSection) });

export type PageDocument = z.infer<typeof pageDocumentSchema>;

const EMPTY: PageDocument = { format: 1, sections: [] };

/** A block as the document keeps it: every column a restore needs, and nothing of where it sat. */
function componentOf(row: ComponentShape): ComponentShape {
  return {
    id: row.id,
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
    items: Array.isArray(row.items) ? row.items : [],
    isActive: row.isActive,
  };
}

/**
 * The draft's rows, frozen — already in the order the panel reads them. Strict: a row that would not
 * read back is a bug to hear about at Publicar, not a block that silently vanishes from the shop.
 */
export function documentOf(rows: readonly SectionShape[]): PageDocument {
  return pageDocumentSchema.parse({
    format: 1,
    sections: rows.map((section) => ({
      id: section.id,
      name: section.name,
      width: section.width,
      background: section.background,
      isActive: section.isActive,
      components: section.components.map(componentOf),
    })),
  });
}

/**
 * A stored document, read without ever throwing. Each band and each block is checked on its own and
 * one that fails is dropped: a document written by a newer deploy — a kind this one does not know —
 * costs the page that block, never the whole page. The same rule the items of a block follow.
 */
export function readPageDocument(raw: unknown): PageDocument {
  if (typeof raw !== 'object' || raw === null || (raw as { format?: unknown }).format !== 1) return EMPTY;

  const sections = (raw as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return EMPTY;

  return {
    format: 1,
    sections: sections.flatMap((section: unknown) => {
      const components = (section as { components?: unknown } | null)?.components;
      const kept = Array.isArray(components)
        ? components.flatMap((component: unknown) => {
            const read = documentComponent.safeParse(component);
            return read.success ? [read.data] : [];
          })
        : [];
      const read = documentSection.safeParse({ ...(section as object), components: kept });
      return read.success ? [read.data] : [];
    }),
  };
}

/**
 * The document as the JSON column takes it. A cast, and a safe one: it has just been parsed by
 * `pageDocumentSchema`, so it holds strings, numbers, booleans, nulls, arrays and plain objects and
 * nothing else — but its items are `unknown[]` to TypeScript, which Prisma's `InputJsonValue` refuses.
 */
export function asJson(document: PageDocument): Prisma.InputJsonValue {
  return document as unknown as Prisma.InputJsonValue;
}

/** The bands a visitor is served: the shown ones. Hidden blocks inside them are dropped by the mapper. */
export function servedSectionsOf(document: PageDocument): SectionShape[] {
  return document.sections.filter((section) => section.isActive);
}

/** Whether two documents would serve the same page: compared as read, so key order never counts. */
export function sameDocument(a: unknown, b: unknown): boolean {
  return isDeepStrictEqual(readPageDocument(a), readPageDocument(b));
}
