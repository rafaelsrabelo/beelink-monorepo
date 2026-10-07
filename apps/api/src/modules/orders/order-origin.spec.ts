// App
import { clickIdOf, fbpOf, originColumnsOf, originLabelOf, pageUrlOf, pastInstantOf, placedConsentOf, placedOriginOf, toOrderOrigin, userAgentOf } from './order-origin.js';

const NOW = Date.parse('2026-10-06T12:00:00.000Z');

describe("an order's origin, as the API takes it in (BEELINK-275)", () => {
  it('cleans a campaign label: no control or invisible character, single spaces, cut at eighty whole characters', () => {
    expect(originLabelOf('  Black\u0000 Friday\n\t2026 ‮ ')).toBe('Black Friday 2026');
    expect(originLabelOf('FaceBook', true)).toBe('facebook');
    expect(originLabelOf('x'.repeat(200))).toHaveLength(80);
    // Cut by characters, never through the middle of one.
    expect(originLabelOf('🐝'.repeat(100))).toBe('🐝'.repeat(80));
    expect(originLabelOf('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
  });

  it('reads nothing as no label', () => {
    for (const nothing of ['', '   ', '\u0000​', 12, null, undefined, {}, ['a']]) expect(originLabelOf(nothing), String(nothing)).toBeNull();
  });

  it("keeps Meta's click identifier whole or not at all", () => {
    expect(clickIdOf('IwAR0abc-DEF_123.xyz')).toBe('IwAR0abc-DEF_123.xyz');
    for (const bad of ['', 'abc def', 'abc;drop', 'a'.repeat(501), '<script>', 7, null]) expect(clickIdOf(bad), String(bad)).toBeNull();
  });

  it("keeps an _fbp only in the shape Meta's library writes", () => {
    expect(fbpOf('fb.1.1759795200000.1234567890')).toBe('fb.1.1759795200000.1234567890');
    for (const bad of ['fb.1.abc.123', 'ga.1.1759795200000.1', 'fb.1.1759795200000.1; x=y', '', null]) expect(fbpOf(bad), String(bad)).toBeNull();
  });

  it('keeps an instant that has happened, and not long ago', () => {
    expect(pastInstantOf('2026-10-01T08:30:00.123Z', NOW)).toBe('2026-10-01T08:30:00.123Z');
    // A browser's clock a little ahead is now, not the future.
    expect(pastInstantOf('2026-10-06T12:02:00.000Z', NOW)).toBe('2026-10-06T12:00:00.000Z');
    for (const bad of ['2026-10-07T12:00:00.000Z', '2026-06-01T00:00:00.000Z', 'yesterday', '', 1759795200000, null]) expect(pastInstantOf(bad, NOW), String(bad)).toBeNull();
  });

  it('cuts a user agent and drops what cannot be seen in it', () => {
    expect(userAgentOf(`Mozilla/5.0\u0007 ${'x'.repeat(600)}`)).toHaveLength(512);
    expect(userAgentOf('  ')).toBeNull();
    expect(userAgentOf(undefined)).toBeNull();
  });

  it("keeps a page's address without its query, and nothing that is not one", () => {
    expect(pageUrlOf('https://beelink.biz/loja/carrinho?cupom=VIP#topo')).toBe('https://beelink.biz/loja/carrinho');
    for (const bad of ['javascript:alert(1)', 'loja/carrinho', `https://beelink.biz/${'a'.repeat(600)}`, '', null]) expect(pageUrlOf(bad), String(bad).slice(0, 30)).toBeNull();
  });

  it('reads a campaign only where a source, a medium or a campaign is named', () => {
    expect(placedOriginOf(undefined)).toBeNull();
    expect(placedOriginOf({ content: 'banner', term: 'whey' })).toBeNull();
    expect(placedOriginOf({ source: 'facebook', arrivedAt: '2026-10-01T08:30:00.000Z' })).toEqual({
      source: 'facebook',
      medium: null,
      campaign: null,
      content: null,
      term: null,
      arrivedAt: new Date('2026-10-01T08:30:00.000Z'),
    });
  });

  it('reads a yes from the object being there, and a click only with its instant', () => {
    expect(placedConsentOf(undefined)).toBeNull();
    expect(placedConsentOf({})).toEqual({ fbclid: null, clickedAt: null, fbp: null, userAgent: null, pageUrl: null });
    expect(placedConsentOf({ fbclid: 'abc123' })).toMatchObject({ fbclid: null, clickedAt: null });
    expect(placedConsentOf({ clickedAt: '2026-10-01T08:30:00.000Z' })).toMatchObject({ fbclid: null, clickedAt: null });
    expect(placedConsentOf({ fbclid: 'abc123', clickedAt: '2026-10-01T08:30:00.123Z' })).toMatchObject({ fbclid: 'abc123', clickedAt: new Date('2026-10-01T08:30:00.123Z') });
  });

  it('says "came by a Meta ad" only of an order whose consent kept a click', () => {
    const origin = placedOriginOf({ source: 'facebook', medium: 'cpc', campaign: 'teste', arrivedAt: '2026-10-01T08:30:00.000Z' });
    const clicked = placedConsentOf({ fbclid: 'abc123', clickedAt: '2026-10-01T08:30:00.000Z' });

    expect(originColumnsOf(origin, null)).toMatchObject({ utmSource: 'facebook', utmMedium: 'cpc', utmCampaign: 'teste', originMetaAd: false });
    expect(originColumnsOf(origin, placedConsentOf({}))).toMatchObject({ originMetaAd: false });
    expect(originColumnsOf(origin, clicked)).toMatchObject({ originMetaAd: true, originAt: new Date('2026-10-01T08:30:00.000Z') });
    // An ad's click with no labels arrived when it was clicked.
    expect(originColumnsOf(null, clicked)).toEqual({ utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null, originAt: new Date('2026-10-01T08:30:00.000Z'), originMetaAd: true });
    expect(originColumnsOf(undefined, undefined)).toMatchObject({ utmSource: null, originAt: null, originMetaAd: false });
  });

  it('tells the shop the labels and whether an ad click was kept, and null with neither', () => {
    expect(toOrderOrigin(originColumnsOf(null, null))).toBeNull();
    expect(toOrderOrigin(originColumnsOf(placedOriginOf({ source: 'facebook' }), null))).toEqual({ source: 'facebook', medium: null, campaign: null, content: null, term: null, metaAd: false });
    expect(toOrderOrigin(originColumnsOf(null, placedConsentOf({ fbclid: 'abc123', clickedAt: '2026-10-01T08:30:00.000Z' })))).toMatchObject({ source: null, metaAd: true });
  });
});
