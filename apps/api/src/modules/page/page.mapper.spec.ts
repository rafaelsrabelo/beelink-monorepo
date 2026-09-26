// Types
import type { StoreComponentModel } from '../../generated/prisma/models.js';

// App
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { toComponent, type SectionRow } from './page.mapper.js';
import { toPublicSection } from './page-public.mapper.js';

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
    source: null,
    sourceCategoryId: null,
    limit: null,
    columns: null,
    align: null,
    visibleOn: 'ALL',
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

describe('page mapper — span and display on every component', () => {
  it('hands both to the panel and to a visitor, as stored', () => {
    const banner = componentRow({ span: 'TWO_THIRDS', display: 'GRID' });
    const heading = componentRow({ kind: 'HEADING', span: 'HALF', display: null });

    expect(toComponent(banner)).toMatchObject({ span: 'TWO_THIRDS', display: 'GRID' });
    expect(toComponent(heading)).toMatchObject({ span: 'HALF', display: null });

    const [publicBanner] = toPublicSection(sectionOf(banner), 'lessari', ROUTE_WORDS.PT_BR).components;
    expect(publicBanner).toMatchObject({ span: 'TWO_THIRDS', display: 'GRID' });
  });
});

describe('where a component shows', () => {
  // The storefront hides by screen size, so both reads carry it: the public one is not filtered by device.
  it('carries visibleOn to the owner and to the shop window alike', () => {
    const row = componentRow({ visibleOn: 'PHONE' });

    expect(toComponent(row).visibleOn).toBe('PHONE');
    expect(toPublicSection(sectionOf(row), 'loja', ROUTE_WORDS.PT_BR).components[0]?.visibleOn).toBe('PHONE');
  });
});
