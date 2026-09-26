// App
import { closedUp, copiedRow, placedAt } from './page-rows.js';

describe('placedAt — where a new row lands in its list', () => {
  const rows = [
    { id: 'a', position: 0 },
    { id: 'b', position: 1 },
    { id: 'c', position: 3 },
  ];

  it('lands last without a place, renumbering only what has a gap', () => {
    expect(placedAt(rows, undefined)).toEqual({ at: 3, moves: [{ id: 'c', position: 2 }] });
  });

  // "Second" means second, whatever the numbers — the column has gaps where rows were deleted.
  it('lands at the place asked, and moves every row after it down one', () => {
    // c already sits at 3, where it has to be: only b is written.
    expect(placedAt(rows, 1)).toEqual({ at: 1, moves: [{ id: 'b', position: 2 }] });
    expect(placedAt(rows, 0).moves).toEqual([
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
    ]);
  });

  it('treats a place past the end as last', () => {
    expect(placedAt(rows, 99).at).toBe(3);
    expect(placedAt([], 5)).toEqual({ at: 0, moves: [] });
  });
});

describe('closedUp — what a list keeps when one of its rows leaves', () => {
  it('renumbers from 0, writing only the rows whose number changes', () => {
    const kept = [
      { id: 'a', position: 0 },
      { id: 'c', position: 2 },
      { id: 'd', position: 3 },
    ];

    expect(closedUp(kept)).toEqual([
      { id: 'c', position: 1 },
      { id: 'd', position: 2 },
    ]);
  });

  it('writes nothing when nothing is left, or nothing has a gap', () => {
    expect(closedUp([])).toEqual([]);
    expect(closedUp([{ id: 'a', position: 0 }])).toEqual([]);
  });
});

describe('copiedRow — a duplicate of a component', () => {
  const row = {
    id: 'original',
    sectionId: 'band',
    storeId: 'shop',
    kind: 'PRODUCTS',
    title: 'Mais vendidos',
    subtitle: 'da semana',
    body: null,
    span: 'HALF',
    display: 'GRID',
    source: 'PICKED',
    sourceCategoryId: null,
    limit: 8,
    columns: 4,
    align: null,
    items: [{ id: 'pick-1', productId: '0199e000-0000-7000-8000-000000000001' }],
    position: 2,
    isActive: false,
    createdAt: new Date('2026-09-25T00:00:00.000Z'),
    updatedAt: new Date('2026-09-25T00:00:00.000Z'),
  } as const;

  it('copies every column the owner set, at the place given', () => {
    expect(copiedRow(row as never, 3)).toMatchObject({
      storeId: 'shop',
      kind: 'PRODUCTS',
      title: 'Mais vendidos',
      subtitle: 'da semana',
      span: 'HALF',
      display: 'GRID',
      source: 'PICKED',
      limit: 8,
      columns: 4,
      position: 3,
      isActive: false,
    });
  });

  // An item's id is how the editor keys a slide or a field; shared, one block's edits land in the other's.
  it('gives each item an id of its own, keeping what it points at', () => {
    const [item] = copiedRow(row as never, 3).items as { id: string; productId: string }[];

    expect(item?.id).not.toBe('pick-1');
    expect(item?.productId).toBe('0199e000-0000-7000-8000-000000000001');
  });
});
