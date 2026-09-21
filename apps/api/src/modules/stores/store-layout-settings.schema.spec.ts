// App
import { parseLayoutSettings } from './store-layout-settings.schema.js';

describe('parseLayoutSettings', () => {
  it('keeps the keys that parse and drops only the one that does not', () => {
    const settings = parseLayoutSettings({
      showBanner: true,
      cardLayout: 'horizontal',
      productsPerRow: 7,
    });

    expect(settings).toEqual({ showBanner: true, cardLayout: 'horizontal' });
  });

  it('drops undeclared keys, because the write path refuses them', () => {
    expect(parseLayoutSettings({ showBanner: true, legacyOnly: 'x' })).toEqual({ showBanner: true });
  });

  it('answers an empty object for a value that is not an object', () => {
    expect(parseLayoutSettings(null)).toEqual({});
    expect(parseLayoutSettings('{}')).toEqual({});
    expect(parseLayoutSettings([])).toEqual({});
  });

  it('refuses a banner image that is not an http url, without losing the rest', () => {
    const settings = parseLayoutSettings({
      showBanner: true,
      bannerImages: ['javascript:alert(1)'],
    });

    expect(settings).toEqual({ showBanner: true });
  });

  it('keeps a well-formed banner image list', () => {
    const images = ['https://res.cloudinary.com/demo/a.png'];

    expect(parseLayoutSettings({ bannerImages: images })).toEqual({ bannerImages: images });
  });
});
