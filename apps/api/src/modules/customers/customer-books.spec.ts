// Libs
import { describe, expect, it } from 'vitest';

// App
import { averageTicketOf } from './customer-books.js';

describe('averageTicketOf', () => {
  it('is the total spent over the valid orders, in whole cents', () => {
    expect(averageTicketOf(33_460n, 2)).toBe(16_730);
    expect(averageTicketOf(24_470, 1)).toBe(24_470);
  });

  it('rounds to the nearest cent, half a cent up', () => {
    expect(averageTicketOf(1_000n, 3)).toBe(333);
    expect(averageTicketOf(2_000n, 3)).toBe(667);
    expect(averageTicketOf(1_001n, 2)).toBe(501);
  });

  it('has no average without a valid order, rather than a zero', () => {
    expect(averageTicketOf(0n, 0)).toBeNull();
  });
});
