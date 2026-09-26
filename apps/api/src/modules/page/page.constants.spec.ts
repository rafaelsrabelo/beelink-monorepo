// App
import { DISPLAYS_OF_KIND, displaysInWords } from './page.constants.js';

describe('displaysInWords', () => {
  it('says each kind\'s layouts as Swagger reads them, one kind per clause', () => {
    const words = displaysInWords();

    expect(words).toContain('BANNER: BACKDROP, SPLIT, CAROUSEL or GRID; PRODUCTS: RAIL or GRID');
    expect(words.split('; ')).toHaveLength(Object.keys(DISPLAYS_OF_KIND).length);
  });

  it('names a kind\'s only layout alone', () => {
    expect(displaysInWords()).toContain('FAQ: ACCORDION');
  });
});
