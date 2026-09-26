// Node
import { randomUUID } from 'node:crypto';

// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { ComponentShape, PageDocument } from './page-document.js';

// App
import { parseComponentItems } from './component-items.schema.js';

/** A block's columns as a restore writes them: the document's, with its items read again. */
function fieldsOf(component: ComponentShape, sourceCategoryId: string | null) {
  return {
    kind: component.kind,
    title: component.title,
    subtitle: component.subtitle,
    body: component.body,
    span: component.span,
    display: component.display,
    source: component.source,
    sourceCategoryId,
    limit: component.limit,
    columns: component.columns,
    align: component.align,
    visibleOn: component.visibleOn,
    // Read the forgiving way: a version frozen under an older shape restores its good items rather
    // than failing the whole restore on one it no longer takes.
    items: parseComponentItems(component.kind, component.items) as object[],
    isActive: component.isActive,
  };
}

/**
 * A version's document, copied into the page's draft in place: every band and block it names is
 * written back with its own id, and whatever the draft holds besides is deleted.
 *
 * The ids are kept on purpose. A lead points at its form by id and loses the link when the row goes,
 * so restoring by deleting and re-creating would unlink every lead; and a restore then publish must
 * serve the page exactly as that version did, ids included — they are what a visitor's form posts.
 * An id the document names that now belongs to another page or shop — no path moves a block between
 * pages, so this is a guard, not a case — is written as a new row with an id of its own.
 *
 * A category a showcase drew from and that is gone is written as none: the column is a foreign key,
 * and naming a missing row would fail the whole restore. The caller holds the shop's lock and has
 * bumped the draft's revision.
 */
export async function restoreDocument(
  tx: Prisma.TransactionClient,
  target: { storeId: string; pageId: string; document: PageDocument },
): Promise<void> {
  const { storeId, pageId, document } = target;
  const sectionIds = document.sections.map((section) => section.id);
  const componentIds = document.sections.flatMap((section) => section.components.map((component) => component.id));
  const categoryIds = document.sections.flatMap((section) =>
    section.components.flatMap((component) => (component.sourceCategoryId ? [component.sourceCategoryId] : [])),
  );

  const [ownSections, ownComponents, takenSections, takenComponents, categories] = await Promise.all([
    tx.storeSection.findMany({ where: { pageId }, select: { id: true } }),
    tx.storeComponent.findMany({ where: { section: { pageId } }, select: { id: true } }),
    tx.storeSection.findMany({ where: { id: { in: sectionIds }, NOT: { pageId } }, select: { id: true } }),
    tx.storeComponent.findMany({ where: { id: { in: componentIds }, NOT: { section: { pageId } } }, select: { id: true } }),
    tx.productCategory.findMany({ where: { id: { in: categoryIds }, storeId }, select: { id: true } }),
  ]);
  const own = { sections: new Set(ownSections.map((row) => row.id)), components: new Set(ownComponents.map((row) => row.id)) };
  const taken = new Set([...takenSections, ...takenComponents].map((row) => row.id));
  const existingCategories = new Set(categories.map((row) => row.id));
  const kept = { sections: new Set<string>(), components: new Set<string>() };

  for (const [position, section] of document.sections.entries()) {
    const band = { name: section.name, width: section.width, background: section.background, isActive: section.isActive, position };
    const sectionId = taken.has(section.id) ? randomUUID() : section.id;

    if (own.sections.has(sectionId)) await tx.storeSection.update({ where: { id: sectionId }, data: band });
    else await tx.storeSection.create({ data: { id: sectionId, storeId, pageId, ...band } });
    kept.sections.add(sectionId);

    for (const [at, component] of section.components.entries()) {
      const category = component.sourceCategoryId && existingCategories.has(component.sourceCategoryId) ? component.sourceCategoryId : null;
      const block = { sectionId, position: at, ...fieldsOf(component, category) };
      const componentId = taken.has(component.id) ? randomUUID() : component.id;

      if (own.components.has(componentId)) await tx.storeComponent.update({ where: { id: componentId }, data: block });
      else await tx.storeComponent.create({ data: { id: componentId, storeId, ...block } });
      kept.components.add(componentId);
    }
  }

  // Blocks first, bands after: a block the document keeps may still sit in a band it drops, and
  // deleting that band first would take the block with it.
  await tx.storeComponent.deleteMany({ where: { section: { pageId }, id: { notIn: [...kept.components] } } });
  await tx.storeSection.deleteMany({ where: { pageId, id: { notIn: [...kept.sections] } } });
}
