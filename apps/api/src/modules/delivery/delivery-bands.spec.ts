// App
import { bandsRefusal, radiusOf } from './delivery-bands.js';

const band = (upToMeters: number, windowFromMinutes = 30, windowToMinutes = 50) => ({ upToMeters, feeCents: 500, windowFromMinutes, windowToMinutes });

describe('the bands of a shop’s own delivery (BEELINK-175)', () => {
  it('takes none, one, and bands that each reach further', () => {
    expect(bandsRefusal([])).toBeNull();
    expect(bandsRefusal([band(3000)])).toBeNull();
    expect(bandsRefusal([band(3000), band(8000), band(15000)])).toBeNull();
  });

  it('refuses a band that does not reach further than the one before', () => {
    expect(bandsRefusal([band(8000), band(3000)])).toMatch(/Band 2/);
    expect(bandsRefusal([band(3000), band(3000)])).toMatch(/Band 2/);
  });

  it('refuses a window that ends before it starts, and takes one of a single instant', () => {
    expect(bandsRefusal([band(3000, 60, 30)])).toMatch(/Band 1/);
    expect(bandsRefusal([band(3000, 45, 45)])).toBeNull();
  });

  it('reads the radius from the last band, and none without bands', () => {
    expect(radiusOf([band(3000), band(8000)])).toBe(8000);
    expect(radiusOf([])).toBeNull();
  });
});
