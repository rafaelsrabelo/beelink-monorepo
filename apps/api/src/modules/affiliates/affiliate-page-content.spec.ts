// App
import { affiliatePageBlockOf } from './affiliate-page-live.js';
import { affiliatePageContentOf } from './affiliate-page-content.js';
import { EMPTY_AFFILIATE_PAGE_CONTENT } from './affiliate-page.constants.js';
import { contentJsonOf } from './affiliate-page.mapper.js';

describe("a page's content as its column holds it (plan 2026-11-14)", () => {
  it('reads nothing, or what is no object, as every text the product\'s own', () => {
    expect(affiliatePageContentOf(null)).toEqual(EMPTY_AFFILIATE_PAGE_CONTENT);
    expect(affiliatePageContentOf('texto')).toEqual(EMPTY_AFFILIATE_PAGE_CONTENT);
    expect(affiliatePageContentOf([])).toEqual(EMPTY_AFFILIATE_PAGE_CONTENT);
  });

  it('reads back what was written, key by key', () => {
    const content = {
      ...EMPTY_AFFILIATE_PAGE_CONTENT,
      title: 'Venda a {loja}',
      highlights: ['Pix'],
      steps: [{ title: 'Inscreva-se', text: 'Um minuto.' }],
      benefits: [],
      questions: [{ question: 'Quando?', answer: 'Três vezes por mês.' }],
      askExtraQuestion: false,
    };
    expect(affiliatePageContentOf(contentJsonOf(content))).toEqual(content);
  });

  it('falls back on a key a row written before it existed lacks, and drops an item that is not one', () => {
    const read = affiliatePageContentOf({ title: 'Antigo', steps: [], benefits: [{ title: 'Pix' }, { title: 'Preço', text: 'O de sempre.' }], questions: 'nenhuma' });
    expect(read).toMatchObject({ title: 'Antigo', steps: null, benefits: [{ title: 'Preço', text: 'O de sempre.' }], questions: null, askExtraQuestion: true, bannerTitle: null });
  });
});

describe('why visitors do not see the page', () => {
  it('says first what the shopkeeper can change', () => {
    expect(affiliatePageBlockOf(false, false, false)).toBe('CLOSED');
    expect(affiliatePageBlockOf(true, false, false)).toBe('PROGRAM_OFF');
    expect(affiliatePageBlockOf(true, true, false)).toBe('LINKS_OFF');
    expect(affiliatePageBlockOf(true, true, true)).toBeNull();
  });
});
