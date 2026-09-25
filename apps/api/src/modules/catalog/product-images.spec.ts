// Libs
import { describe, expect, it, vi } from 'vitest';

// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { imageRows, refuseForeignImageValues } from './product-images.js';

function txCounting(known: number) {
  const count = vi.fn().mockResolvedValue(known);
  return { tx: { productOptionValue: { count } } as unknown as Prisma.TransactionClient, count };
}

describe('a product’s photos and the values they are of', () => {
  it('stores the photos in the order sent, each value once', () => {
    expect(imageRows([{ url: '/a.jpg' }, { url: '/b.jpg', alt: 'Pote', optionValueIds: ['v1', 'v2', 'v1'] }])).toEqual([
      { url: '/a.jpg', alt: null, position: 0, values: { create: [] } },
      { url: '/b.jpg', alt: 'Pote', position: 1, values: { create: [{ valueId: 'v1' }, { valueId: 'v2' }] } },
    ]);
  });

  it('asks nothing of the database when no photo names a value', async () => {
    const { tx, count } = txCounting(0);
    await refuseForeignImageValues(tx, 'p1', [{ url: '/a.jpg' }]);
    expect(count).not.toHaveBeenCalled();
  });

  it('accepts values of the product’s own options, counted once', async () => {
    const { tx, count } = txCounting(2);
    await refuseForeignImageValues(tx, 'p1', [
      { url: '/a.jpg', optionValueIds: ['v1'] },
      { url: '/b.jpg', optionValueIds: ['v1', 'v2'] },
    ]);
    expect(count).toHaveBeenCalledWith({ where: { id: { in: ['v1', 'v2'] }, option: { productId: 'p1' } } });
  });

  it('refuses a value the product does not have, and any value while it is being created', async () => {
    await expect(refuseForeignImageValues(txCounting(1).tx, 'p1', [{ url: '/a.jpg', optionValueIds: ['v1', 'v9'] }])).rejects.toMatchObject({
      response: { errorCode: 'PRODUCT_OPTION_NOT_FOUND' },
    });
    await expect(refuseForeignImageValues(txCounting(0).tx, null, [{ url: '/a.jpg', optionValueIds: ['v1'] }])).rejects.toMatchObject({
      response: { errorCode: 'PRODUCT_OPTION_NOT_FOUND' },
    });
  });
});
