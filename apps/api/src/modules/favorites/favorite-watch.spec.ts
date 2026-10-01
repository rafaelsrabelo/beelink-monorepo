// Libs
import { describe, expect, it } from 'vitest';

// App
import { watchOf } from './favorite-watch.js';

const onSale = (priceCents: number) => ({ priceCents, soldOut: false, orderable: true });

describe('watchOf', () => {
  it('tells a drop that can be ordered, from the mark, and moves the mark to it', () => {
    expect(watchOf({ priceCents: 10000, soldOut: false }, onSale(8000))).toEqual({
      seen: { priceCents: 8000, soldOut: false },
      notice: { previousPriceCents: 10000, backInStock: false },
    });
  });

  it('takes a rise as the new mark, and tells nothing', () => {
    expect(watchOf({ priceCents: 10000, soldOut: false }, onSale(12000))).toEqual({ seen: { priceCents: 12000, soldOut: false }, notice: null });
  });

  it('keeps a drop nobody can buy for later: the mark only rises while it cannot be ordered', () => {
    const soldOut = watchOf({ priceCents: 10000, soldOut: false }, { priceCents: 9000, soldOut: true, orderable: false });
    expect(soldOut).toEqual({ seen: { priceCents: 10000, soldOut: true }, notice: null });

    // Back, at the lower price: both, from the price before it sold out.
    expect(watchOf(soldOut.seen, onSale(9000)).notice).toEqual({ previousPriceCents: 10000, backInStock: true });
  });

  it('tells a product liked as a whole whose cheapest is sold out no drop, while it is still in stock', () => {
    expect(watchOf({ priceCents: 10000, soldOut: false }, { priceCents: 7000, soldOut: false, orderable: false })).toEqual({
      seen: { priceCents: 10000, soldOut: false },
      notice: null,
    });
  });

  it('tells a return alone when the price did not drop', () => {
    expect(watchOf({ priceCents: 10000, soldOut: true }, onSale(10000)).notice).toEqual({ previousPriceCents: null, backInStock: true });
  });
});
