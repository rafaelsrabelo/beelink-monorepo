// App
import { normaliseSlugText, slugChangeableOn, slugProblemOf } from './store-slugs.js';

describe('when a page may change its address again (BEELINK-331)', () => {
  it('may at once when it never changed', () => {
    expect(slugChangeableOn(null, new Date('2026-10-17T12:00:00.000Z'))).toBeNull();
  });

  it("is 30 days on by Brasília's calendar, from that day's first instant", () => {
    // 17/10 at 0h01 and at 23h59 in Brasília are one day: both may change again from 16/11, 0h there.
    const early = new Date('2026-10-17T03:01:00.000Z');
    const late = new Date('2026-10-18T02:59:00.000Z');

    expect(slugChangeableOn(early, early)).toBe('2026-11-16');
    expect(slugChangeableOn(late, late)).toBe('2026-11-16');
    expect(slugChangeableOn(late, new Date('2026-11-16T02:59:59.999Z'))).toBe('2026-11-16');
    expect(slugChangeableOn(late, new Date('2026-11-16T03:00:00.000Z'))).toBeNull();
  });

  it('counts across a month and a year like any other day', () => {
    expect(slugChangeableOn(new Date('2026-12-15T15:00:00.000Z'), new Date('2026-12-15T15:00:00.000Z'))).toBe('2027-01-14');
  });
});

describe("what is wrong with an address, by the creation's rules", () => {
  it('is nothing for an address that holds to them', () => {
    expect(slugProblemOf('padaria-do-bairro')).toBeNull();
    expect(slugProblemOf('abc')).toBeNull();
    expect(slugProblemOf('a'.repeat(40))).toBeNull();
  });

  it('is INVALID for one too short, too long, or not of a-z, 0-9 and single hyphens', () => {
    expect(slugProblemOf('ab')).toBe('INVALID');
    expect(slugProblemOf('a'.repeat(41))).toBe('INVALID');
    expect(slugProblemOf('padaria--do')).toBe('INVALID');
    expect(slugProblemOf('')).toBe('INVALID');
  });

  it('is RESERVED for a route of the app itself', () => {
    expect(slugProblemOf('admin')).toBe('RESERVED');
    expect(slugProblemOf('mine')).toBe('RESERVED');
  });
});

describe('the normalisation every address goes through', () => {
  it('folds accents, lowers case and keeps single hyphens with none at either end', () => {
    expect(normaliseSlugText('  Cantina do Zé! ')).toBe('cantina-do-ze');
    expect(normaliseSlugText('PÃO & CAFÉ')).toBe('pao-cafe');
    expect(normaliseSlugText('---')).toBe('');
  });
});
