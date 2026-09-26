// App
import { PAGE_SLUG_MAX_LENGTH, pageSlugOf } from './page-slug.js';

describe('pageSlugOf', () => {
  it('folds a title into the address the shop will show, as every other segment is folded', () => {
    expect(pageSlugOf('Lançamento Whey 900 g')).toEqual({ slug: 'lancamento-whey-900-g', valid: true });
  });

  it('cuts a long title to the column without leaving a hyphen at the end', () => {
    const { slug, valid } = pageSlugOf(`${'a'.repeat(PAGE_SLUG_MAX_LENGTH - 1)} bcd`);

    expect(slug).toBe('a'.repeat(PAGE_SLUG_MAX_LENGTH - 1));
    expect(valid).toBe(true);
  });

  it('calls an address with too little left in it invalid, rather than inventing one', () => {
    expect(pageSlugOf('!!!')).toEqual({ slug: '', valid: false });
    expect(pageSlugOf('Z')).toEqual({ slug: 'z', valid: false });
  });
});
