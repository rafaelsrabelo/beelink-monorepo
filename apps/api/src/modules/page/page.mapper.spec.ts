// Types
import type { StoreComponentModel } from '../../generated/prisma/models.js';

// App
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { SHOWCASE_LAYOUTS, SPAN_OF_LAYOUT } from './page.constants.js';
import { toComponent, toPublicSection, type SectionRow } from './page.mapper.js';

const WRITTEN = new Date('2026-09-23T00:00:00.000Z');

function componentRow(over: Partial<StoreComponentModel> = {}): StoreComponentModel {
  return {
    id: '0199c000-0000-7000-8000-000000000001',
    sectionId: '0199b000-0000-7000-8000-000000000001',
    storeId: '0199a0f1-0000-7000-8000-000000000001',
    kind: 'BANNER',
    title: null,
    subtitle: null,
    body: null,
    span: 'FULL',
    display: 'CAROUSEL',
    columns: null,
    align: null,
    items: [],
    position: 0,
    isActive: true,
    createdAt: WRITTEN,
    updatedAt: WRITTEN,
    ...over,
  };
}

function sectionOf(component: StoreComponentModel): SectionRow {
  return {
    id: component.sectionId,
    storeId: component.storeId,
    name: null,
    width: 'CONTAINED',
    background: null,
    position: 0,
    isActive: true,
    components: [component],
    createdAt: WRITTEN,
    updatedAt: WRITTEN,
  };
}

/**
 * The column is `span` and the wire still says `layout`. A shopkeeper who picked "um terço" before
 * the migration has to read "um terço" back after it, on the panel and on the shop window alike:
 * anything else is the migration rearranging a page nobody touched.
 */
describe('page mapper — the wire still says layout', () => {
  it.each(SHOWCASE_LAYOUTS)('answers %s for a row stored from it, to the panel and to a visitor', (layout) => {
    const row = componentRow({ span: SPAN_OF_LAYOUT[layout] });

    expect(toComponent(row).layout).toBe(layout);
    expect(toPublicSection(sectionOf(row), 'lessari', ROUTE_WORDS.PT_BR).components[0]!.layout).toBe(layout);
  });
});
