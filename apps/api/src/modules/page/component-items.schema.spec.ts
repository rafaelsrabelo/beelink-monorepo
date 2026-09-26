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

describe('a call to action\'s button', () => {
  const button = componentItemsFor('CALL_TO_ACTION');
  const PRODUCT = '0199e000-0000-7000-8000-000000000001';

  it('takes one button with its words and where it leads, or none', () => {
    expect(button.safeParse([{ id: 'b', label: 'Comprar', target: 'PRODUCT', productId: PRODUCT }]).success).toBe(true);
    expect(button.safeParse([{ id: 'b', label: 'Ver site', target: 'EXTERNAL', externalUrl: 'https://exemplo.com' }]).success).toBe(true);
    expect(button.safeParse([]).success).toBe(true);
  });

  it('refuses a button that goes nowhere, says nothing, or claims what it does not carry', () => {
    expect(button.safeParse([{ id: 'b', label: 'Comprar', target: 'NONE' }]).success).toBe(false);
    expect(button.safeParse([{ id: 'b', label: ' ', target: 'PRODUCT', productId: PRODUCT }]).success).toBe(false);
    expect(button.safeParse([{ id: 'b', label: 'Comprar', target: 'PRODUCT' }]).success).toBe(false);
  });

  it('refuses two buttons: a call to action asks one thing', () => {
    const one = { label: 'Comprar', target: 'PRODUCT', productId: PRODUCT };
    expect(button.safeParse([{ id: 'a', ...one }, { id: 'b', ...one }]).success).toBe(false);
  });
});

describe('an image with text\'s picture', () => {
  const media = componentItemsFor('IMAGE_TEXT');
  const picture = { id: 'm', imageUrl: 'https://cdn.example/a.png' };

  it('takes a picture, what it shows and a button, or nothing at all', () => {
    expect(media.safeParse([picture]).success).toBe(true);
    expect(media.safeParse([{ ...picture, alt: 'Uma blusa azul', button: { label: 'Ver', target: 'EXTERNAL', externalUrl: 'https://x.com' } }]).success).toBe(true);
    expect(media.safeParse([]).success).toBe(true);
  });

  it('refuses a picture that is not an address, a button to nowhere, and two pictures', () => {
    expect(media.safeParse([{ ...picture, imageUrl: 'javascript:alert(1)' }]).success).toBe(false);
    expect(media.safeParse([{ ...picture, button: { label: 'Ver', target: 'NONE' } }]).success).toBe(false);
    expect(media.safeParse([picture, { ...picture, id: 'n' }]).success).toBe(false);
  });
});
