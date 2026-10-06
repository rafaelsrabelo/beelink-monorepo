// Node
import { randomUUID } from 'node:crypto';

// Types
import type { PageKind, StoreType } from '@harness-monorepo/contracts';
import type { ComponentShape, PageDocument, SectionShape } from './page-document.js';
import type { SeededBand } from './page-seed.js';

// App
import { documentOf } from './page-document.js';
import { openingShowcase } from './page-seed.js';

type SeededComponent = SeededBand['components'][number];

const isStrip = (component: { kind: string }) => component.kind === 'ANNOUNCEMENT';

/** A model's block as a document holds it: what the columns default to, said out loud. */
function componentOf(id: string, component: SeededComponent): ComponentShape {
  return {
    id,
    kind: component.kind,
    title: component.title ?? null,
    subtitle: component.subtitle ?? null,
    body: component.body ?? null,
    span: component.span ?? 'FULL',
    display: component.display ?? null,
    source: component.source ?? null,
    sourceCategoryId: component.sourceCategoryId ?? null,
    limit: component.limit ?? null,
    columns: component.columns ?? null,
    align: component.align ?? null,
    visibleOn: 'ALL',
    items: component.items,
    isActive: component.isActive,
  };
}

/**
 * A model's bands as the draft they would leave on a page: one document, ready to be restored into
 * the draft or resolved for a preview. Pure — the ids come from `newId`.
 *
 * The model replaces everything but what is the shop's and not the page's arrangement:
 *
 * - The strip above the header. On the home, the band holding it stays as it is, ids included, and
 *   first; the model's own strip, should it bring one, is dropped. A landing holds none.
 * - The link between a lead and its form. A contact form the model brings takes the id of one the
 *   draft already had, in order — the row is updated in place, so the leads that came through it
 *   still point at a form. A form the model does not replace goes, and its leads are kept unlinked,
 *   as when the block is deleted.
 *
 * And it leaves the page the rules would accept: the home of a shop that sells always has a showcase,
 * so one is added last when the model brought none.
 */
export function arrangedDocument(
  bands: readonly SeededBand[],
  target: { pageKind: PageKind; storeType: StoreType; draft: readonly SectionShape[] },
  newId: () => string = randomUUID,
): PageDocument {
  const home = target.pageKind === 'HOME';

  // One strip, the first: a second is a double-click's leftover, and the page is being replaced anyway.
  const stripBand = home ? target.draft.find((section) => section.components.some(isStrip)) : undefined;
  const kept = stripBand ? [{ ...stripBand, components: stripBand.components.filter(isStrip).slice(0, 1) }] : [];

  let stripsAllowed = home && !stripBand ? 1 : 0;
  const arranged: SeededBand[] = [];
  for (const band of [...bands].sort((a, b) => a.section.position - b.section.position)) {
    const components = [...band.components]
      .sort((a, b) => a.position - b.position)
      .filter((component) => !isStrip(component) || stripsAllowed-- > 0);
    // A band left with nothing would be a blank strip of the page.
    if (components.length) arranged.push({ section: band.section, components });
  }

  const sells = target.storeType === 'ECOMMERCE';
  if (home && sells && !arranged.some((band) => band.components.some((component) => component.kind === 'PRODUCTS'))) {
    arranged.push(openingShowcase(arranged.length));
  }

  const forms = target.draft.flatMap((section) => section.components.filter((component) => component.kind === 'CONTACT').map((component) => component.id));

  const sections: SectionShape[] = arranged.map((band) => ({
    id: newId(),
    name: band.section.name ?? null,
    width: band.section.width,
    background: null,
    isActive: band.section.isActive,
    components: band.components.map((component) => componentOf((component.kind === 'CONTACT' ? forms.shift() : undefined) ?? newId(), component)),
  }));

  return documentOf([...kept, ...sections]);
}
