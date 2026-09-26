// App
import { documentOf, readPageDocument, sameDocument, servedSectionsOf, type SectionShape } from './page-document.js';

function block(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    kind: 'HEADING' as const,
    title: 'Oi',
    subtitle: null,
    body: null,
    span: 'FULL' as const,
    display: null,
    source: null,
    sourceCategoryId: null,
    limit: null,
    columns: null,
    align: null,
    visibleOn: 'ALL' as const,
    items: [],
    isActive: true,
    // What a row carries and a document does not.
    sectionId: 'band',
    storeId: 'shop',
    position: 3,
    ...over,
  };
}

function band(id: string, components: ReturnType<typeof block>[], isActive = true): SectionShape & { position: number } {
  return { id, name: null, width: 'CONTAINED', background: null, isActive, components, position: 9 };
}

describe('documentOf', () => {
  it('keeps hidden bands and blocks, in the order given, and nothing of where they sat', () => {
    const doc = documentOf([band('b2', [block('c2', { isActive: false })], false), band('b1', [block('c1')])]);

    expect(doc.sections.map((section) => section.id)).toEqual(['b2', 'b1']);
    expect(doc.sections[0]).toMatchObject({ isActive: false, components: [{ id: 'c2', isActive: false }] });
    expect(doc.sections[0]).not.toHaveProperty('position');
    expect(doc.sections[0]!.components[0]).not.toHaveProperty('sectionId');
    expect(doc.sections[0]!.components[0]).not.toHaveProperty('storeId');
  });
});

describe('readPageDocument', () => {
  it('drops a block it cannot read — a kind from a newer deploy — and keeps the rest of the page', () => {
    const raw = { format: 1, sections: [{ ...band('b1', [block('c1')]), components: [block('c1'), block('c2', { kind: 'TESTIMONIALS' as never })] }] };

    expect(readPageDocument(raw).sections[0]!.components.map((component) => component.id)).toEqual(['c1']);
  });

  it('never throws: anything that is not a document reads as an empty page', () => {
    for (const raw of [null, undefined, 'x', { format: 2, sections: [] }, { format: 1 }]) {
      expect(readPageDocument(raw)).toEqual({ format: 1, sections: [] });
    }
  });
});

describe('servedSectionsOf and sameDocument', () => {
  it('serves the shown bands only; hidden blocks are the mapper’s to drop', () => {
    const doc = documentOf([band('b1', [block('c1', { isActive: false })]), band('b2', [], false)]);

    expect(servedSectionsOf(doc).map((section) => section.id)).toEqual(['b1']);
    expect(servedSectionsOf(doc)[0]!.components).toHaveLength(1);
  });

  it('calls two documents the same whatever order their keys were written in', () => {
    const doc = documentOf([band('b1', [block('c1')])]);
    const reordered = JSON.parse(JSON.stringify({ sections: doc.sections, format: 1 })) as unknown;

    expect(sameDocument(doc, reordered)).toBe(true);
    expect(sameDocument(doc, documentOf([band('b1', [block('c1', { title: 'Tchau' })])]))).toBe(false);
  });
});
