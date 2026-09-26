// App
import { componentItemsFor, parseComponentItems } from './component-items.schema.js';
import { FAQ_ANSWER_MAX_LENGTH, FAQ_ITEMS_MAX } from './page.constants.js';

const question = (id: string, over: Record<string, unknown> = {}) => ({ id, question: 'Qual o prazo?', answer: 'Três dias úteis.', ...over });

describe('FAQ items', () => {
  const faq = componentItemsFor('FAQ');

  it('takes questions with their answers, in order', () => {
    expect(faq.safeParse([question('a'), question('b')]).success).toBe(true);
    expect(faq.safeParse([]).success).toBe(true);
  });

  it('refuses a question with no answer, or an answer with no question', () => {
    expect(faq.safeParse([question('a', { answer: '  ' })]).success).toBe(false);
    expect(faq.safeParse([question('a', { question: '' })]).success).toBe(false);
  });

  it('refuses two questions with one id, a key it does not know, and more than it holds', () => {
    expect(faq.safeParse([question('a'), question('a')]).success).toBe(false);
    expect(faq.safeParse([question('a', { imageUrl: 'https://x' })]).success).toBe(false);
    expect(faq.safeParse(Array.from({ length: FAQ_ITEMS_MAX + 1 }, (_, at) => question(`q${at}`))).success).toBe(false);
    expect(faq.safeParse([question('a', { answer: 'x'.repeat(FAQ_ANSWER_MAX_LENGTH + 1) })]).success).toBe(false);
  });

  it('reads stored questions that no longer parse as none, never a throw', () => {
    expect(parseComponentItems('FAQ', [{ id: 'a' }])).toEqual([]);
  });
});
