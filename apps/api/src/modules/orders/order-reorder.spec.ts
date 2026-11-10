// Libs
import { describe, expect, it } from 'vitest';

// App
import { reorderOf, type ReorderItem, type ReorderVariant } from './order-reorder.js';

const item = (over: Partial<ReorderItem>): ReorderItem => ({ productId: 'p1', variantId: 'v1', productName: 'Whey', variantLabel: 'Sabor: Uva', quantity: 2, ...over });
const variant = (over: Partial<ReorderVariant>): ReorderVariant => ({
  id: 'v1',
  productId: 'p1',
  isActive: true,
  archivedAt: null,
  trackStock: false,
  stockQuantity: null,
  productStatus: 'ACTIVE',
  productHasOptions: true,
  ...over,
});

describe('reorderOf', () => {
  it('puts back the same combinations and quantities while the shop sells them', () => {
    expect(reorderOf(14, [item({}), item({ productId: 'p2', variantId: 'v2', quantity: 1 })], [variant({}), variant({ id: 'v2', productId: 'p2' })])).toEqual({
      number: 14,
      lines: [
        { productId: 'p1', variantId: 'v1', quantity: 2 },
        { productId: 'p2', variantId: 'v2', quantity: 1 },
      ],
      left: [],
    });
  });

  /** The cart writes a product without options by its product alone: the same here, so the lines add up. */
  it('names no combination for a product without options, as the cart does', () => {
    expect(reorderOf(1, [item({})], [variant({ productHasOptions: false })]).lines).toEqual([{ productId: 'p1', variantId: null, quantity: 2 }]);
  });

  it('leaves out what the shop no longer sells: a draft, a switched-off or archived combination, one deleted', () => {
    const off = { productName: 'Whey', variantLabel: 'Sabor: Uva', reason: 'OFF_SALE', added: 0 };

    expect(reorderOf(1, [item({})], [variant({ productStatus: 'DRAFT' })]).left).toEqual([off]);
    expect(reorderOf(1, [item({})], [variant({ isActive: false })]).left).toEqual([off]);
    expect(reorderOf(1, [item({})], [variant({ archivedAt: new Date() })]).left).toEqual([off]);
    expect(reorderOf(1, [item({ variantId: null, productId: null })], []).left).toEqual([off]);
    expect(reorderOf(1, [item({})], []).lines).toEqual([]);
  });

  /** The catalogue never says how many are left; the reorder is where the count is used, and only to cap. */
  it('leaves out a combination with none left, and puts in only what is left of one with fewer', () => {
    expect(reorderOf(1, [item({})], [variant({ trackStock: true, stockQuantity: 0 })])).toMatchObject({ lines: [], left: [{ reason: 'SOLD_OUT', added: 0 }] });

    const limited = reorderOf(1, [item({ quantity: 3 })], [variant({ trackStock: true, stockQuantity: 1 })]);
    expect(limited.lines).toEqual([{ productId: 'p1', variantId: 'v1', quantity: 1 }]);
    expect(limited.left).toEqual([{ productName: 'Whey', variantLabel: 'Sabor: Uva', reason: 'LIMITED', added: 1 }]);

    // Made to order has no stock to run out of.
    expect(reorderOf(1, [item({ quantity: 50 })], [variant({ trackStock: false, stockQuantity: 0 })]).lines[0]?.quantity).toBe(50);
  });

  // Plan 2026-11-10--kits-monte-seu-kit: what went in a kit is chosen again on its page, never bought again blind.
  it('leaves a kit out, to be put together again, and puts back the rest', () => {
    const reorder = reorderOf(9, [item({ productName: 'Kit Festa', variantLabel: null, quantity: 1 }), item({ productId: 'p2', variantId: 'v2' })], [variant({ productIsKit: true }), variant({ id: 'v2', productId: 'p2' })]);

    expect(reorder.lines).toEqual([{ productId: 'p2', variantId: 'v2', quantity: 2 }]);
    expect(reorder.left).toEqual([{ productName: 'Kit Festa', variantLabel: null, reason: 'KIT', added: 0 }]);
  });
});
