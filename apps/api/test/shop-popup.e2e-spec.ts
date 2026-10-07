// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, Coupon, CustomerOffers, Promotion, StorefrontOffers, StorePopupOverview, StorePopupPayload } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/** The form as a shopkeeper who only switched it on would send it. */
const FORM = { enabled: true, imageUrl: null, title: null, text: null, buttonLabel: null, trigger: 'ON_ARRIVAL', delaySeconds: 5, benefitSource: 'AUTO', benefitId: null, keepReminder: true } as const satisfies StorePopupPayload;

/**
 * A shop's first-purchase pop-up (BEELINK-306): the owner's form, what it refuses, and what anyone
 * is served of it inside the shop's offers — a benefit by its kind and amount, never a code, never
 * a coupon the shop hides, never another shop's.
 */
describe("a shop's first-purchase pop-up", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function made<T>(path: string, body: object, shop = 'lessari', by = owner): Promise<T> {
    const response = await call('POST', `/api/stores/${shop}/${path}`, by, body);
    if (response.statusCode !== 201) throw new Error(`POST ${path} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  const couponBody = (body: object) => ({ code: 'PRIMEIRA10', kind: 'PERCENT', percentBps: 1000, startsAt: daysFromNow(-1), audience: 'FIRST_PURCHASE', shownInStore: true, ...body });
  /** A shown coupon for a first purchase, unless the body says otherwise. */
  const coupon = (body: object = {}, shop = 'lessari', by = owner) => made<Coupon>('coupons', couponBody(body), shop, by);
  const promotion = (body: object = {}) => made<Promotion>('promotions', { name: 'Primeira compra', scope: 'CART', discountKind: 'PERCENT', percentBps: 1500, startsAt: daysFromNow(-1), audience: 'FIRST_PURCHASE', ...body });

  const save = (body: object = {}, session = owner, shop = 'lessari') => call('PUT', `/api/stores/${shop}/popup`, session, { ...FORM, ...body });
  const saved = async (body: object = {}) => {
    const response = await save(body);
    if (response.statusCode !== 200) throw new Error(`PUT popup answered ${response.statusCode}: ${response.payload}`);
    return response.json<StorePopupOverview>();
  };
  const refusal = async (body: object) => {
    const response = await save(body);
    return { status: response.statusCode, code: response.json<ApiErrorBody>().errorCode };
  };
  const overview = async () => (await call('GET', '/api/stores/lessari/popup', owner)).json<StorePopupOverview>();
  const served = async (shop = 'lessari') => {
    const response = await call('GET', `/api/stores/${shop}/offers`);
    if (response.statusCode !== 200) throw new Error(`GET offers answered ${response.statusCode}: ${response.payload}`);
    return { popup: response.json<StorefrontOffers>().popup, raw: response.payload };
  };

  describe("the owner's form", () => {
    it('reads the defaults, switched off, until first saved', async () => {
      const response = await call('GET', '/api/stores/lessari/popup', owner);

      expect(response.statusCode).toBe(200);
      expect(response.json<StorePopupOverview>()).toEqual({
        settings: { enabled: false, imageUrl: null, title: null, text: null, buttonLabel: null, trigger: 'ON_ARRIVAL', delaySeconds: 5, benefitSource: 'AUTO', benefitId: null, keepReminder: true, revision: 1, updatedAt: null },
        benefit: null,
        headline: null,
        options: [],
        customerOffer: null,
      });
      expect(await prisma.storePopup.count()).toBe(0);
    });

    it('saves the whole of it and reads it back', async () => {
      const body = { imageUrl: 'https://res.cloudinary.com/demo/popup.jpg', title: 'Ganhe {beneficio} agora', text: 'Crie sua conta e o desconto é seu.', buttonLabel: 'Quero meu cupom', trigger: 'ON_LEAVE', delaySeconds: 12 };

      expect((await saved(body)).settings).toMatchObject({ ...body, enabled: true, benefitSource: 'AUTO', benefitId: null, revision: 1 });
      const read = await overview();
      expect(read.settings).toMatchObject(body);
      expect(read.settings.updatedAt).not.toBeNull();
    });

    it("is the owner's alone: nobody signed out, no other shopkeeper, no shopper of the shop", async () => {
      const stranger = await signUpAndSignIn(app, newEmail('outra'));
      const email = newEmail('cliente');
      await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD });
      await verifyEmailOf(app, email);
      const shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();

      expect((await call('GET', '/api/stores/lessari/popup')).statusCode).toBe(401);
      expect((await call('PUT', '/api/stores/lessari/popup', undefined, FORM)).statusCode).toBe(401);
      expect((await call('GET', '/api/stores/lessari/popup', stranger)).statusCode).toBe(403);
      expect((await save({}, stranger)).statusCode).toBe(403);
      expect((await call('GET', '/api/stores/lessari/popup', shopper)).statusCode).toBe(401);
      expect((await save({}, shopper)).statusCode).toBe(401);
      expect((await call('GET', '/api/stores/ninguem/popup', owner)).statusCode).toBe(404);
      expect(await prisma.storePopup.count()).toBe(0);
    });

    it('refuses a field out of its bounds, and a key left out', async () => {
      const INVALID = { status: 400, code: 'POPUP_SETTINGS_INVALID' };

      expect(await refusal({ title: 'a'.repeat(81) })).toEqual(INVALID);
      expect(await refusal({ text: 'a'.repeat(201) })).toEqual(INVALID);
      expect(await refusal({ buttonLabel: 'a'.repeat(31) })).toEqual(INVALID);
      expect(await refusal({ delaySeconds: 61 })).toEqual(INVALID);
      expect(await refusal({ delaySeconds: -1 })).toEqual(INVALID);
      expect(await refusal({ delaySeconds: 2.5 })).toEqual(INVALID);
      expect(await refusal({ delaySeconds: '5' })).toEqual(INVALID);
      expect(await refusal({ trigger: 'ON_SCROLL' })).toEqual(INVALID);
      expect(await refusal({ enabled: 'sim' })).toEqual(INVALID);
      expect(await refusal({ keepReminder: 'sim' })).toEqual(INVALID);
      expect(await refusal({ keepReminder: null })).toEqual(INVALID);
      expect(await refusal({ benefitSource: 'BEST' })).toEqual(INVALID);
      expect(await refusal({ title: 12 })).toEqual(INVALID);
      // A picture is drawn in `src`: nothing but http(s).
      expect(await refusal({ imageUrl: 'javascript:alert(1)' })).toEqual(INVALID);
      expect(await refusal({ imageUrl: 'data:image/png;base64,AAAA' })).toEqual(INVALID);
      for (const key of Object.keys(FORM)) {
        const { [key as keyof typeof FORM]: _left, ...rest } = FORM;
        expect((await call('PUT', '/api/stores/lessari/popup', owner, rest)).statusCode).toBe(400);
      }
      expect((await call('PUT', '/api/stores/lessari/popup', owner, { ...FORM, html: '<b>oi</b>' })).statusCode).toBe(400);
      expect(await prisma.storePopup.count()).toBe(0);

      // The bounds themselves are taken.
      expect((await save({ title: 'a'.repeat(80), text: 'a'.repeat(200), buttonLabel: 'a'.repeat(30), delaySeconds: 60 })).statusCode).toBe(200);
      expect((await save({ delaySeconds: 0 })).statusCode).toBe(200);
    });

    // A NUL never gets this far: the API refuses any body holding one, for every route.
    it('keeps a sentence as plain text: control characters out, blanks collapsed, nothing left is the default', async () => {
      const { settings } = await saved({ title: '  Oi\u0007\u009F \n\t tudo\u202E bem  ', text: ' \n ', buttonLabel: '<b>Ganhar</b>', imageUrl: '  ' });

      expect(settings.title).toBe('Oi tudo bem');
      expect(settings.text).toBeNull();
      expect(settings.imageUrl).toBeNull();
      // Stored as typed and drawn as text: markup is letters here, and the page never parses it.
      expect(settings.buttonLabel).toBe('<b>Ganhar</b>');
    });

    it('refuses a discount typed by hand, in any of the three sentences, and takes the placeholder', async () => {
      const TYPED = { status: 400, code: 'POPUP_TEXT_PROMISES_NUMBER' };

      expect(await refusal({ title: 'Ganhe 10% na primeira compra' })).toEqual(TYPED);
      expect(await refusal({ title: 'Ganhe 10 % agora' })).toEqual(TYPED);
      expect(await refusal({ text: 'São R$ 15 de desconto' })).toEqual(TYPED);
      expect(await refusal({ text: 'São r$15,00 de desconto' })).toEqual(TYPED);
      expect(await refusal({ buttonLabel: 'Quero 5%' })).toEqual(TYPED);
      expect(await prisma.storePopup.count()).toBe(0);

      expect((await saved({ title: 'Ganhe {beneficio} na primeira compra', text: 'Entrega em 2 dias para todo o Brasil.' })).settings.title).toBe('Ganhe {beneficio} na primeira compra');
    });
  });

  describe('what it announces', () => {
    it("follows the shop's first-purchase headline unless it names one, and lists what it may name", async () => {
      const first = await coupon({ code: 'PRIMEIRA10' });
      const deal = await promotion();
      // Neither of these can be announced: one is hidden, the other for everyone.
      await coupon({ code: 'OCULTO20', percentBps: 2000, shownInStore: false });
      await coupon({ code: 'TODOS5', percentBps: 500, audience: 'EVERYONE' });

      const auto = await saved();
      // The promotion: it applies by itself, as the offer strip says it.
      expect(auto.benefit).toMatchObject({ source: 'PROMOTION', percentBps: 1500 });
      expect(auto.options.map((option) => [option.source, option.id, option.label])).toEqual([
        ['PROMOTION', deal.id, 'Primeira compra'],
        ['COUPON', first.id, 'PRIMEIRA10'],
      ]);

      const named = await saved({ benefitSource: 'COUPON', benefitId: first.id });
      expect(named.settings).toMatchObject({ benefitSource: 'COUPON', benefitId: first.id });
      expect(named.benefit).toEqual({ source: 'COUPON', kind: 'PERCENT', percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null, wholeCart: true });
      // What following the shop would say is still told, for the form to preview that choice.
      expect(named.headline).toMatchObject({ source: 'PROMOTION', percentBps: 1500 });

      expect((await saved({ benefitSource: 'PROMOTION', benefitId: deal.id })).benefit).toMatchObject({ source: 'PROMOTION', percentBps: 1500, wholeCart: true });
      // Back to following the shop: an id sent along is not kept.
      expect((await saved({ benefitSource: 'AUTO', benefitId: first.id })).settings).toMatchObject({ benefitSource: 'AUTO', benefitId: null });
    });

    it('refuses to name a hidden coupon, one for everyone, a promotion for everyone, another shop\'s, or nothing', async () => {
      const BENEFIT = { status: 400, code: 'POPUP_BENEFIT_INVALID' };
      const hidden = await coupon({ code: 'OCULTO20', shownInStore: false });
      const everyone = await coupon({ code: 'TODOS5', audience: 'EVERYONE' });
      const open = await promotion({ name: 'Para todos', audience: 'EVERYONE' });
      const first = await coupon({ code: 'PRIMEIRA10' });
      const neighbour = await signUpAndSignIn(app, newEmail('vizinha'));
      await call('POST', '/api/stores', neighbour, shopBody('vizinha'));
      const theirs = await coupon({ code: 'VIZINHA10' }, 'vizinha', neighbour);

      expect(await refusal({ benefitSource: 'COUPON', benefitId: hidden.id })).toEqual(BENEFIT);
      expect(await refusal({ benefitSource: 'COUPON', benefitId: everyone.id })).toEqual(BENEFIT);
      expect(await refusal({ benefitSource: 'PROMOTION', benefitId: open.id })).toEqual(BENEFIT);
      expect(await refusal({ benefitSource: 'COUPON', benefitId: theirs.id })).toEqual(BENEFIT);
      // A coupon's id is not a promotion's.
      expect(await refusal({ benefitSource: 'PROMOTION', benefitId: first.id })).toEqual(BENEFIT);
      expect(await refusal({ benefitSource: 'COUPON', benefitId: null })).toEqual(BENEFIT);
      expect(await refusal({ benefitSource: 'COUPON', benefitId: 'primeira10' })).toEqual(BENEFIT);
      expect(await prisma.storePopup.count()).toBe(0);
    });

    it('announces nothing once the one it names is out of force — it does not fall back to another offer', async () => {
      const named = await coupon({ code: 'ESCOLHIDO' });
      await coupon({ code: 'OUTRO15', percentBps: 1500 });
      await saved({ benefitSource: 'COUPON', benefitId: named.id });
      expect((await served()).popup?.benefit).toMatchObject({ source: 'COUPON', percentBps: 1000 });

      await call('PATCH', `/api/stores/lessari/coupons/${named.id}`, owner, { active: false });
      expect((await served()).popup?.benefit).toBeNull();
      const paused = await overview();
      expect(paused.benefit).toBeNull();
      expect(paused.settings).toMatchObject({ benefitSource: 'COUPON', benefitId: named.id });
      expect(paused.options.map((option) => option.label)).toEqual(['OUTRO15']);

      // Running again, but no longer shown: a hidden coupon is announced to nobody.
      await call('PUT', `/api/stores/lessari/coupons/${named.id}`, owner, couponBody({ code: 'ESCOLHIDO', shownInStore: false, active: true }));
      expect((await served()).popup?.benefit).toBeNull();

      await call('PUT', `/api/stores/lessari/coupons/${named.id}`, owner, couponBody({ code: 'ESCOLHIDO', active: true }));
      expect((await served()).popup?.benefit).toMatchObject({ source: 'COUPON', percentBps: 1000 });
    });

    it('announces nothing of a named promotion that is paused, and announces it again when it runs', async () => {
      const deal = await promotion();
      await coupon({ code: 'OUTRO15' });
      await saved({ benefitSource: 'PROMOTION', benefitId: deal.id });

      await call('PATCH', `/api/stores/lessari/promotions/${deal.id}`, owner, { active: false });
      expect((await served()).popup?.benefit).toBeNull();
      await call('PATCH', `/api/stores/lessari/promotions/${deal.id}`, owner, { active: true });
      expect((await served()).popup?.benefit).toMatchObject({ source: 'PROMOTION', percentBps: 1500 });
    });
  });

  describe('what anyone is served', () => {
    it('is nothing from a shop that never saved one, or switched it off — not even what it configured', async () => {
      expect((await served()).popup).toBeNull();

      await saved({ enabled: false, title: 'Só para depois', imageUrl: 'https://res.cloudinary.com/demo/secreto.jpg' });
      const off = await served();
      expect(off.popup).toBeNull();
      expect(off.raw).not.toContain('Só para depois');
      expect(off.raw).not.toContain('secreto.jpg');
    });

    it('is the pop-up as configured, with its benefit and without the switch, the choice, a code or an id', async () => {
      const first = await coupon({ code: 'SEGREDO15', percentBps: 1500, minSubtotalCents: 5000 });
      await saved({ title: 'Ganhe {beneficio}', imageUrl: 'https://res.cloudinary.com/demo/popup.jpg', trigger: 'ON_LEAVE', delaySeconds: 9, benefitSource: 'COUPON', benefitId: first.id });

      const { popup, raw } = await served();
      expect(popup).toEqual({
        revision: 1,
        imageUrl: 'https://res.cloudinary.com/demo/popup.jpg',
        title: 'Ganhe {beneficio}',
        text: null,
        buttonLabel: null,
        trigger: 'ON_LEAVE',
        delaySeconds: 9,
        benefit: { source: 'COUPON', kind: 'PERCENT', percentBps: 1500, amountCents: null, minSubtotalCents: 5000, endsAt: null, wholeCart: true },
        keepReminder: true,
      });
      expect(raw).not.toContain('SEGREDO15');
      expect(raw).not.toContain(first.id);
    });

    it('invites plainly at a shop with nothing for a first purchase: a hidden coupon is no benefit', async () => {
      await coupon({ code: 'OCULTO20', shownInStore: false });
      await coupon({ code: 'TODOS5', audience: 'EVERYONE' });
      await saved();

      const { popup, raw } = await served();
      expect(popup).toMatchObject({ revision: 1, benefit: null });
      expect(raw).not.toContain('OCULTO20');
    });

    it("is one shop's alone", async () => {
      const neighbour = await signUpAndSignIn(app, newEmail('vizinha'));
      await call('POST', '/api/stores', neighbour, shopBody('vizinha'));
      await coupon({ code: 'VIZINHA10' }, 'vizinha', neighbour);
      await save({ title: 'Da vizinha' }, neighbour, 'vizinha');

      expect((await served()).popup).toBeNull();
      expect((await served('vizinha')).popup).toMatchObject({ title: 'Da vizinha', benefit: { source: 'COUPON' } });
      expect((await overview()).settings).toMatchObject({ enabled: false, title: null });
      expect((await overview()).options).toEqual([]);
    });
  });

  describe("the strip's reminder (BEELINK-310)", () => {
    it('is on for a shop that never said, and for a pop-up saved before the switch existed', async () => {
      expect((await overview()).settings.keepReminder).toBe(true);

      // A row as the first migration wrote it: the column's own default answers.
      const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { id: true } });
      await prisma.storePopup.create({ data: { storeId, enabled: true } });
      expect((await overview()).settings.keepReminder).toBe(true);
      expect((await served()).popup?.keepReminder).toBe(true);
    });

    it('is saved, read back and served as saved', async () => {
      expect((await saved({ keepReminder: false })).settings.keepReminder).toBe(false);
      expect((await overview()).settings.keepReminder).toBe(false);
      expect((await served()).popup?.keepReminder).toBe(false);

      expect((await saved({ keepReminder: true })).settings.keepReminder).toBe(true);
      expect((await served()).popup?.keepReminder).toBe(true);
    });

    it("is the owner's to change, and nobody else's", async () => {
      const stranger = await signUpAndSignIn(app, newEmail('outra'));
      await saved({ keepReminder: true });

      expect((await save({ keepReminder: false }, stranger)).statusCode).toBe(403);
      expect((await call('PUT', '/api/stores/lessari/popup', undefined, { ...FORM, keepReminder: false })).statusCode).toBe(401);
      expect((await served()).popup?.keepReminder).toBe(true);
    });

    it('is served to nobody while the pop-up is switched off: the strip is then as it always was', async () => {
      await saved({ enabled: false, keepReminder: false });

      expect((await served()).popup).toBeNull();
    });
  });

  describe('what a signed-in customer who never ordered is told (BEELINK-310)', () => {
    async function shopperOf(name: string) {
      const email = newEmail(name);
      await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD });
      await verifyEmailOf(app, email);
      return (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    }
    const theirOffers = async (shopper: AuthSession) => (await call('POST', '/api/stores/lessari/customer/offers', shopper, {})).json<CustomerOffers>();

    it("is, in the owner's preview, the very offer that customer's own read answers — the coupon with its code, whatever the pop-up names", async () => {
      const deal = await promotion();
      await coupon({ code: 'ANTIGO5', percentBps: 500 });
      await coupon({ code: 'PRIMEIRA10', minSubtotalCents: 5000 });
      // The pop-up names the promotion for its visitors; a customer is still told their coupon.
      const read = await saved({ benefitSource: 'PROMOTION', benefitId: deal.id });

      expect(read.customerOffer).toEqual({ source: 'COUPON', code: 'PRIMEIRA10', kind: 'PERCENT', percentBps: 1000, amountCents: null, minSubtotalCents: 5000, endsAt: null });
      expect((await theirOffers(await shopperOf('cliente'))).firstPurchase).toEqual(read.customerOffer);
    });

    it('is the promotion, with no code, at a shop whose first-purchase coupons are hidden — and the same to the customer', async () => {
      await promotion({ scope: 'CART' });
      await coupon({ code: 'OCULTO20', shownInStore: false });

      const read = await saved();
      expect(read.customerOffer).toEqual({ source: 'PROMOTION', kind: 'PERCENT', percentBps: 1500, amountCents: null, minSubtotalCents: 0, endsAt: null, wholeCart: true });
      expect(JSON.stringify(read.customerOffer)).not.toContain('OCULTO20');
      expect((await theirOffers(await shopperOf('cliente'))).firstPurchase).toEqual(read.customerOffer);
    });

    it('is nothing at a shop with nothing for a first purchase', async () => {
      await coupon({ code: 'TODOS5', audience: 'EVERYONE' });
      await coupon({ code: 'OCULTO20', shownInStore: false });

      expect((await saved()).customerOffer).toBeNull();
      expect((await theirOffers(await shopperOf('cliente'))).firstPurchase).toBeNull();
    });

    it('never reaches what anyone is served: the public pop-up carries no code', async () => {
      await coupon({ code: 'SEGREDO15', percentBps: 1500 });
      await saved();

      const { popup, raw } = await served();
      expect(popup).not.toHaveProperty('customerOffer');
      expect(raw).not.toContain('SEGREDO15');
    });
  });

  describe('its revision', () => {
    it("goes up when what a visitor reads changes, and stays when the switch, the trigger or the strip's reminder does", async () => {
      const first = await coupon({ code: 'PRIMEIRA10' });
      const revisionAfter = async (body: object) => (await saved(body)).settings.revision;
      let form: object = {};
      const change = (patch: object) => revisionAfter((form = { ...form, ...patch }));

      expect(await change({})).toBe(1);
      // The same form again is the same pop-up.
      expect(await change({})).toBe(1);
      expect(await change({ enabled: false })).toBe(1);
      expect(await change({ enabled: true, trigger: 'ON_LEAVE', delaySeconds: 30 })).toBe(1);

      expect(await change({ title: 'Outro título' })).toBe(2);
      expect(await change({ text: 'Outro texto' })).toBe(3);
      expect(await change({ buttonLabel: 'Quero' })).toBe(4);
      expect(await change({ imageUrl: 'https://res.cloudinary.com/demo/popup.jpg' })).toBe(5);
      expect(await change({ benefitSource: 'COUPON', benefitId: first.id })).toBe(6);
      expect(await change({ benefitSource: 'AUTO', benefitId: null })).toBe(7);
      expect(await change({ trigger: 'ON_ARRIVAL' })).toBe(7);
      expect(await change({ keepReminder: false })).toBe(7);
      expect((await served()).popup?.revision).toBe(7);
    });
  });
});
