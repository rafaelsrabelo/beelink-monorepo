// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerCashback, CustomerProfile } from '@harness-monorepo/contracts';

// App
import { CashbackExpiryMailer } from '../src/modules/cashback/cashback-expiry-mailer.js';
import { CashbackSweeper } from '../src/modules/cashback/cashback-sweeper.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const RULES = { enabled: true, rateBps: 500, expiresAfterDays: 10, minSubtotalCents: 0, maxRedeemBps: 10000 };
const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

describe('credit expires by itself, and its customer is told a week before (BEELINK-241)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let sweeper: CashbackSweeper;
  let mailer: CashbackExpiryMailer;
  let owner: AuthSession;
  let shopper: AuthSession;
  let email: string;
  let me: CustomerProfile;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    sweeper = app.get(CashbackSweeper);
    mailer = app.get(CashbackExpiryMailer);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await call('PUT', '/api/stores/lessari/cashback', owner, RULES);
    email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    me = (await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>();
    await clearInbox();
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const give = (amountCents: number) => call('POST', `/api/stores/lessari/customers/${me.id}/cashback/adjustments`, owner, { amountCents, reason: 'Crédito de teste' });
  const cashback = () => call('GET', `/api/stores/lessari/customers/${me.id}/cashback`, owner).then((response) => response.json<CustomerCashback>());
  const inDays = (days: number) => new Date(Date.now() + days * DAY);
  // By subject: signing a new account up mails it a confirmation, which is not what is counted here.
  const expiryMails = async () => ((await (await fetch(`${MAILPIT}/api/v1/search?${new URLSearchParams({ query: 'subject:"vence em"' }).toString()}`)).json()) as { messages: unknown[] }).messages.length;

  describe('the expiry', () => {
    it('takes what is left of an expired lot off the balance, with a line on the statement — once', async () => {
      await give(1_500);

      expect(await sweeper.sweep(inDays(11))).toBe(1);
      expect(await sweeper.sweep(inDays(12))).toBe(0);

      const after = await cashback();
      expect(after).toMatchObject({ balanceCents: 0, credits: [] });
      expect(after.entries.map((entry) => [entry.kind, entry.amountCents])).toEqual([
        ['EXPIRE', -1_500],
        ['ADJUST', 1_500],
      ]);
      expect((await prisma.cashbackCredit.findFirstOrThrow({ where: { customerId: me.id } })).status).toBe('EXPIRED');
    });

    it('expires a lot only once with two sweeps at the same time', async () => {
      await give(1_500);

      const swept = await Promise.all([sweeper.sweep(inDays(11)), sweeper.sweep(inDays(11))]);

      expect(swept.reduce((sum, count) => sum + count, 0)).toBe(1);
      expect(await prisma.cashbackEntry.count({ where: { kind: 'EXPIRE' } })).toBe(1);
    });

    it('leaves alone what has not expired, and what a shop with no validity gave', async () => {
      await give(1_000);
      await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, expiresAfterDays: null });
      await give(500);

      expect(await sweeper.sweep(inDays(5))).toBe(0);
      // Ten years on, the one with no validity is still there.
      await sweeper.sweep(inDays(3650));
      expect((await cashback()).balanceCents).toBe(500);
    });
  });

  describe('the notice', () => {
    it('tells the customer a week before, by e-mail, once per lot', async () => {
      await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, expiresAfterDays: 5 });
      await give(1_250);

      await sweeper.sweep(new Date());
      const mail = await waitForMessage(email, 10_000, 'vence');
      expect(mail.Subject).toMatch(/^lessari — seu cashback de R\$\s12,50 vence em \d{2}\/\d{2}\/\d{4}$/);
      expect(mail.Text).toContain('desmarque "Cashback" e salve');

      await sweeper.sweep(new Date());
      expect(await prisma.cashbackExpiryNotice.count()).toBe(1);
    });

    it('owes nothing for a lot more than a week from its expiry', async () => {
      await give(1_250);

      await sweeper.sweep(new Date());

      expect(await prisma.cashbackExpiryNotice.count()).toBe(0);
    });

    /** What the sweep owes, its own dispatch may be sending already: what is done is read once `sentAt` says so. */
    const settled = () => vi.waitFor(async () => expect(await prisma.cashbackExpiryNotice.count({ where: { sentAt: null } })).toBe(0));

    it('sends nothing to a customer who turned the notice off, and does not try again', async () => {
      await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, expiresAfterDays: 5 });
      await give(1_250);
      await call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, { orders: true, favorites: true, cashback: false, offers: false });

      await sweeper.sweep(new Date());
      await mailer.flush();
      await settled();

      expect(await prisma.cashbackExpiryNotice.count()).toBe(1);
      expect(await expiryMails()).toBe(0);
    });

    it('sends nothing for credit spent after the notice was owed', async () => {
      await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, expiresAfterDays: 5 });
      await give(1_250);
      // Owed as a sweep owes it, then spent before it goes.
      const lot = await prisma.cashbackCredit.findFirstOrThrow({ where: { customerId: me.id } });
      await prisma.cashbackExpiryNotice.create({ data: { creditId: lot.id } });
      await give(-1_250);

      await mailer.flush();
      await settled();

      expect(await expiryMails()).toBe(0);
    });

    it('sends nothing to an account whose e-mail was never confirmed', async () => {
      await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, expiresAfterDays: 5 });
      const unconfirmed = newEmail('sem-confirmar');
      await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Caio', email: unconfirmed, password: PASSWORD });
      const record = await prisma.customer.findFirstOrThrow({ where: { user: { email: unconfirmed } } });
      await call('POST', `/api/stores/lessari/customers/${record.id}/cashback/adjustments`, owner, { amountCents: 500, reason: 'Crédito de teste' });

      await sweeper.sweep(new Date());
      await mailer.flush();
      await settled();

      expect(await prisma.cashbackExpiryNotice.count()).toBe(1);
      expect(await expiryMails()).toBe(0);
    });

    it("turns the notice off and on again from the shopper's notices", async () => {
      const choose = (cashback: boolean) => call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, { orders: true, favorites: true, cashback, offers: false });

      expect((await choose(false)).json()).toMatchObject({ cashback: false });
      expect((await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>().notifications).toMatchObject({ cashback: false });
      expect((await choose(true)).json()).toMatchObject({ cashback: true });
      // A form drawn before the box existed says nothing of it: the choice stays as it was.
      expect((await call('PUT', '/api/stores/lessari/customer/me/notifications', shopper, { orders: true, favorites: true, offers: false })).json()).toMatchObject({ cashback: true });
    });
  });
});
