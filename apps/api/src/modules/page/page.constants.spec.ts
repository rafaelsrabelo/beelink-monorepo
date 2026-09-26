// App
import { displaysInWords } from './page.constants.js';

describe('displaysInWords', () => {
  it('says each kind\'s layouts as Swagger reads them', () => {
    expect(displaysInWords()).toBe(
      'BANNER: BACKDROP, SPLIT, CAROUSEL or GRID; PRODUCTS: RAIL or GRID; CATEGORIES: RAIL, GRID or CHIPS; BENEFITS: INLINE or CARDS; ANNOUNCEMENT: STATIC or MARQUEE',
    );
  });
});
