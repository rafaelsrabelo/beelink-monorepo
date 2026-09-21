// Nest
import { BadRequestException } from '@nestjs/common';

// App
import { CatalogSlugService } from './catalog-slug.service.js';
import { ROUTE_WORDS } from './catalog.constants.js';

const slugs = new CatalogSlugService();

describe('CatalogSlugService.resolve', () => {
  it('derives the segment from the name when none was sent', () => {
    expect(slugs.resolve(undefined, 'Blusa Feminina Tomara Que Caia')).toBe(
      'blusa-feminina-tomara-que-caia',
    );
  });

  it('normalises an explicit segment the same way, instead of refusing it', () => {
    expect(slugs.resolve('Blusas!', 'ignored')).toBe('blusas');
  });

  it('refuses a word the shop\'s own addresses use, in either vocabulary', () => {
    // The point of reserving both: a PT_BR shop must not be able to take `products` either, or
    // switching its vocabulary later would orphan the category.
    expect(() => slugs.resolve('produtos', 'x')).toThrow(BadRequestException);
    expect(() => slugs.resolve('products', 'x')).toThrow(BadRequestException);
  });

  it("refuses the index of categories, which a category of that name would hide", () => {
    // `/<shop>/categorias` is the index; `/<shop>/blusas` is one category. A shop allowed to slug a
    // category `categorias` owns a page the resolver reads as the index and never reaches.
    expect(() => slugs.resolve('categorias', 'x')).toThrow(BadRequestException);
    expect(() => slugs.resolve('categories', 'x')).toThrow(BadRequestException);
  });

  it('refuses every word of every vocabulary, so adding one cannot orphan a category', () => {
    // The invariant the reserved list exists for: a word added to ROUTE_WORDS and not reserved is a
    // slug a shop can take today and lose the day that word starts resolving.
    for (const words of Object.values(ROUTE_WORDS)) {
      for (const word of Object.values(words)) {
        expect(() => slugs.resolve(word, 'x')).toThrow(BadRequestException);
      }
    }
  });

  it('refuses a segment the storefront will need later', () => {
    expect(() => slugs.resolve('carrinho', 'x')).toThrow(BadRequestException);
    expect(() => slugs.resolve('checkout', 'x')).toThrow(BadRequestException);
  });

  it('refuses a name that leaves nothing addressable, rather than inventing one', () => {
    expect(() => slugs.resolve(undefined, '!!!')).toThrow(BadRequestException);
  });

  it('answers the reserved code, so the panel can say which rule was broken', () => {
    expect.assertions(1);
    try {
      slugs.resolve('produtos', 'x');
    } catch (error) {
      expect((error as BadRequestException).getResponse()).toMatchObject({
        errorCode: 'CATALOG_SLUG_RESERVED',
      });
    }
  });
});

describe('CatalogSlugService.historyAfterRename', () => {
  it('keeps the old segment, so a link already shared redirects instead of 404ing', () => {
    expect(slugs.historyAfterRename('blusa-azul', 'blusa-marinho', [])).toEqual(['blusa-azul']);
  });

  it('changes nothing when the segment did not change', () => {
    expect(slugs.historyAfterRename('blusa-azul', 'blusa-azul', ['antiga'])).toEqual(['antiga']);
  });

  it('drops a segment that came back, so it is never both live and historical', () => {
    // Otherwise the resolver would answer a redirect to the page the visitor already asked for.
    expect(slugs.historyAfterRename('b', 'a', ['a'])).toEqual(['b']);
  });

  it('retires the oldest link once the bound is reached', () => {
    const ten = Array.from({ length: 10 }, (_unused, index) => `s${index}`);
    const after = slugs.historyAfterRename('current', 'next', ten);

    expect(after).toHaveLength(10);
    expect(after[0]).toBe('s1');
    expect(after.at(-1)).toBe('current');
  });
});
