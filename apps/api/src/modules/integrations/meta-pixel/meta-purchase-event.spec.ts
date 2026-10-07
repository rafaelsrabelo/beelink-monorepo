// Node
import { readFileSync } from 'node:fs';

// App
import { hashedEmailOf, hashedPhoneOf, purchaseCountsWhen, purchaseCustomDataOf, purchaseEventIdOf, purchaseEventOf, purchaseUserDataOf, TEST_EVENT_NAME, testEventOf, type PurchaseLine } from './meta-purchase-event.js';

interface Case {
  name: string;
  order: { id: string; paymentChannel: 'ONLINE' | 'OFFLINE'; totalCents: number; deliveryFeeCents: number | null; items: PurchaseLine[] };
  expected: { moment: 'PLACED' | 'PAID'; countedAt: string; eventId: string; customData: object };
}

/** The cases the web's `purchase.fixtures.test.ts` reads too: the browser's event and this one are held to the same answers. */
const { cases } = JSON.parse(readFileSync(new URL('../../../../../../packages/contracts/fixtures/meta-purchase.json', import.meta.url), 'utf8')) as { cases: Case[] };

const ORDER = '0199b001-0000-7000-8000-000000000001';
const PRODUCT = '0199a111-0000-7000-8000-000000000001';
const order = { id: ORDER, totalCents: 10450, items: [{ productId: PRODUCT, quantity: 1, lineTotalCents: 8950, discountCents: 0 }] };
const COUNTED = new Date('2026-10-06T14:00:00.500Z');
const NOTHING_KEPT = { fbclid: null, clickedAt: null, fbp: null, userAgent: null, pageUrl: null };

describe("the purchase told from the server is the browser's (BEELINK-274)", () => {
  it('reads cases enough to mean something', () => {
    expect(cases.length).toBeGreaterThanOrEqual(5);
  });

  it.each(cases)('$name', ({ order: placed, expected }) => {
    expect(purchaseCountsWhen(placed)).toBe(expected.moment);
    expect(purchaseEventIdOf(placed.id)).toBe(expected.eventId);
    expect(purchaseCustomDataOf(placed)).toEqual(expected.customData);
  });

  it('counts an order charged online with its delivery still to be agreed when it is paid, whatever its total reads', () => {
    expect(purchaseCountsWhen({ paymentChannel: 'ONLINE', totalCents: 0, deliveryFeeCents: null })).toBe('PAID');
    expect(purchaseCountsWhen({ paymentChannel: 'OFFLINE', totalCents: 0, deliveryFeeCents: null })).toBe('PLACED');
  });
});

describe("Meta's normalisation, by its own examples", () => {
  /** https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters */
  it('hashes an e-mail trimmed and in lowercase', () => {
    expect(hashedEmailOf('John_Smith@gmail.com')).toBe('62a14e44f765419d10fea99367361a727c12365e2520f32218d505ed9aa0f62f');
    expect(hashedEmailOf('  JOHN_SMITH@GMAIL.COM \n')).toBe('62a14e44f765419d10fea99367361a727c12365e2520f32218d505ed9aa0f62f');
  });

  it('hashes a phone as its digits, country code first, leading zeros gone', () => {
    expect(hashedPhoneOf('5511999998888')).toBe('b8e374ecc3a7a117a4df68efc21b0157f7c2ea542f7edaf29b33dc8818cf695e');
    expect(hashedPhoneOf('+55 (11) 99999-8888')).toBe('b8e374ecc3a7a117a4df68efc21b0157f7c2ea542f7edaf29b33dc8818cf695e');
    expect(hashedPhoneOf('005511999998888')).toBe('b8e374ecc3a7a117a4df68efc21b0157f7c2ea542f7edaf29b33dc8818cf695e');
  });

  /** A phone is kept here with its country code already: prefixing one would hash a number nobody has. */
  it('puts no country code in front, and sends none of a phone too short to carry one', () => {
    expect(hashedPhoneOf('5511999998888')).not.toBe(hashedPhoneOf('555511999998888'));
    expect(hashedPhoneOf('11999998888')).toBeNull();
    expect(hashedPhoneOf('')).toBeNull();
    expect(hashedPhoneOf(null)).toBeNull();
  });

  it('hashes nothing that is no e-mail', () => {
    expect(hashedEmailOf(null)).toBeNull();
    expect(hashedEmailOf('  ')).toBeNull();
    expect(hashedEmailOf('sem-arroba')).toBeNull();
  });
});

describe('what Meta is told of who bought', () => {
  it('sends everything the order kept, and of the person only two hashes', () => {
    const consent = { fbclid: 'IwAR0abc_DEF-123', clickedAt: new Date('2026-10-01T10:00:00.123Z'), fbp: 'fb.1.1791333000000.1234567890', userAgent: 'Mozilla/5.0 (teste)', pageUrl: 'https://beelink.biz/lessari/carrinho' };
    const event = purchaseEventOf({ order, countedAt: COUNTED, buyer: { email: 'Ana@Exemplo.com.br', phone: '5511999998888' }, consent, shopUrl: 'https://beelink.biz/lessari' });

    expect(event).toEqual({
      event_name: 'Purchase',
      event_time: 1791295200,
      event_id: `purchase-${ORDER}`,
      action_source: 'website',
      event_source_url: 'https://beelink.biz/lessari/carrinho',
      user_data: {
        em: ['9908ab973926622870fbcc257bf5c75e507d89d24698137563dab84b1e2cb423'],
        ph: ['b8e374ecc3a7a117a4df68efc21b0157f7c2ea542f7edaf29b33dc8818cf695e'],
        fbc: 'fb.1.1790848800123.IwAR0abc_DEF-123',
        fbp: 'fb.1.1791333000000.1234567890',
        client_user_agent: 'Mozilla/5.0 (teste)',
      },
      custom_data: { value: 104.5, currency: 'BRL', content_ids: [PRODUCT], content_type: 'product', contents: [{ id: PRODUCT, quantity: 1, item_price: 89.5 }], num_items: 1 },
    });
  });

  it("sends the least of an order that kept nothing but the yes: the e-mail's hash and the shop's own address", () => {
    const event = purchaseEventOf({ order, countedAt: COUNTED, buyer: { email: 'ana@exemplo.com.br', phone: null }, consent: NOTHING_KEPT, shopUrl: 'https://beelink.biz/lessari' });

    expect(event.user_data).toEqual({ em: ['9908ab973926622870fbcc257bf5c75e507d89d24698137563dab84b1e2cb423'] });
    expect(event.event_source_url).toBe('https://beelink.biz/lessari');
  });

  it('builds no click id from half of one', () => {
    expect(purchaseUserDataOf({ email: null, phone: null }, { ...NOTHING_KEPT, fbclid: 'abc' })).toEqual({});
    expect(purchaseUserDataOf({ email: null, phone: null }, { ...NOTHING_KEPT, clickedAt: new Date() })).toEqual({});
  });

  /** Whatever a later change adds to the query, these never reach Meta from here. */
  it('names nothing else of the person: no address of the network, no name, no document, no place', () => {
    const event = purchaseEventOf({ order, countedAt: COUNTED, buyer: { email: 'ana@exemplo.com.br', phone: '5511999998888' }, consent: { ...NOTHING_KEPT, userAgent: 'x' }, shopUrl: 'https://beelink.biz/lessari' });

    expect(Object.keys(event.user_data).sort()).toEqual(['client_user_agent', 'em', 'ph']);
    expect(Object.keys(event).sort()).toEqual(['action_source', 'custom_data', 'event_id', 'event_name', 'event_source_url', 'event_time', 'user_data']);
    expect(JSON.stringify(event)).not.toMatch(/ana@|99999|client_ip_address/);
  });
});

describe('the test event', () => {
  it('is a custom event about nobody, with no value: Meta does not drop a test event, and a purchase would be counted', () => {
    const event = testEventOf({ id: 'shop-1' }, 'https://beelink.biz/lessari', new Date('2026-10-06T14:00:00.000Z'));

    expect(event.event_name).toBe(TEST_EVENT_NAME);
    expect(event.event_name).not.toBe('Purchase');
    expect(event.custom_data).toBeUndefined();
    expect(Object.keys(event.user_data).sort()).toEqual(['client_user_agent', 'external_id']);
    expect(event.user_data.external_id?.[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(event.event_source_url).toBe('https://beelink.biz/lessari');
  });
});
