// App
import { slugify } from './slug.js';

describe('slugify', () => {
  it('folds an accent to its base letter instead of dropping it', () => {
    expect(slugify('Camisetão')).toBe('camisetao');
    expect(slugify('Cantina do Zé')).toBe('cantina-do-ze');
  });

  it('collapses every run of non-alphanumerics into one hyphen', () => {
    expect(slugify('Blusa  feminina — tomara que caia!')).toBe('blusa-feminina-tomara-que-caia');
  });

  it('leaves no hyphen at either end, which the legacy generateSlug did', () => {
    expect(slugify('  -- Promoção! --  ')).toBe('promocao');
  });

  it('is idempotent, so re-saving a stored slug never changes it', () => {
    const once = slugify('Blusão de Inverno');
    expect(slugify(once)).toBe(once);
  });

  // The API's own reason for this file: two modules deriving the same segment must agree. A name
  // that folds differently in two places is a collision the unique index cannot describe.
  it('gives one answer for a name a category and a product could share', () => {
    expect(slugify('Promoção')).toBe(slugify('promocao'));
  });

  it('answers the empty string for a name with nothing to keep, and does not throw', () => {
    expect(slugify('!!!')).toBe('');
  });
});
