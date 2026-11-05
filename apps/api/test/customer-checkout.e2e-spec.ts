// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerCheckoutAnswer, CustomerProfile } from '@harness-monorepo/contracts';

// App
import { LEGAL_VERSION } from '../src/modules/auth/auth.constants.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const shop = (slug: string) => ({
  name: slug,
  slug,
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
});

/** The code out of the e-mail's subject, "123 456 é o seu código na …", as the six digits. */
const codeOf = (subject: string) => subject.slice(0, 7).replace(' ', '');

describe("the checkout's door: buying with no sign-up", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

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
    const owner = await signUpAndSignIn(app, newEmail('dona'));
    for (const slug of ['lessari', 'outra']) {
      await app.inject({ method: 'POST', url: '/api/stores', headers: { authorization: `Bearer ${owner.accessToken}` }, payload: shop(slug) });
    }
  });

  const identify = (slug: string, payload: object) => app.inject({ method: 'POST', url: `/api/stores/${slug}/customer/checkout`, payload });
  const withCode = (slug: string, payload: object) => app.inject({ method: 'POST', url: `/api/stores/${slug}/customer/checkout/code`, payload });
  const me = (slug: string, session: AuthSession) => app.inject({ method: 'GET', url: `/api/stores/${slug}/customer/me`, headers: { authorization: `Bearer ${session.accessToken}` } });

  it('opens the account of an e-mail the shop does not know and signs it in at once, with no password and the e-mail still to confirm', async () => {
    const email = newEmail('nova');

    const response = await identify('lessari', { name: ' Bia Cliente ', email: email.toUpperCase(), phone: '(11) 98765-4321' });

    expect(response.statusCode).toBe(200);
    const answer = response.json<CustomerCheckoutAnswer>();
    if (answer.kind !== 'SESSION') throw new Error('expected a session');
    expect(answer.session.user).toMatchObject({ name: 'Bia Cliente', email, emailVerified: false });

    const profile = (await me('lessari', answer.session)).json<CustomerProfile>();
    expect(profile).toMatchObject({ name: 'Bia Cliente', email, phone: '5511987654321' });

    const account = await prisma.user.findFirstOrThrow({ where: { email }, include: { legalAcceptances: true } });
    expect(account.passwordHash).toBeNull();
    expect(account.emailVerifiedAt).toBeNull();
    // The checkout said, beside its button, that going on accepts the terms (BEELINK-171).
    expect(account.legalAcceptances).toEqual([expect.objectContaining({ version: LEGAL_VERSION, via: 'CHECKOUT' })]);
    // The confirmation link goes, as a sign-up's does: confirmed, the e-mail hears of the orders.
    expect((await waitForMessage(email)).Subject).toBe('lessari — confirme seu e-mail');
  });

  it('e-mails a code to an e-mail that already has an account here, and the code signs that account in and confirms its e-mail', async () => {
    const email = newEmail('conhecida');
    expect((await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/register', payload: { name: 'Ana Souza', email, password: PASSWORD } })).statusCode).toBe(202);
    await clearInbox();

    const response = await identify('lessari', { name: 'Quem Digitou', email, phone: '11987654321' });
    expect(response.json()).toEqual({ kind: 'CODE_SENT' });

    const message = await waitForMessage(email);
    expect(message.Subject).toMatch(/^\d{3} \d{3} é o seu código na lessari$/);
    expect(message.From).toMatchObject({ Name: 'lessari' });
    expect(message.Text).toContain('Olá, Ana!');

    const signedIn = await withCode('lessari', { email, code: message.Subject.slice(0, 7) });
    expect(signedIn.statusCode).toBe(200);
    const session = signedIn.json<AuthSession>();
    expect(session.user).toMatchObject({ email, emailVerified: true });
    // The account is the one that was there: what the checkout typed changed nothing of it.
    expect((await me('lessari', session)).json<CustomerProfile>()).toMatchObject({ name: 'Ana Souza', phone: null });

    // Spent: the same code twice opens nothing.
    expect((await withCode('lessari', { email, code: codeOf(message.Subject) })).json()).toMatchObject({ errorCode: 'CUSTOMER_CODE_INVALID' });
  });

  it('stops a code after five wrong tries, right or wrong after that, and says the same for every way a code fails', async () => {
    const email = newEmail('tentativas');
    await identify('lessari', { name: 'Bia', email, phone: '11987654321' });
    await clearInbox();
    await identify('lessari', { name: 'Bia', email, phone: '11987654321' });
    const code = codeOf((await waitForMessage(email)).Subject);
    const wrong = code === '000000' ? '111111' : '000000';

    for (let attempt = 0; attempt < 5; attempt++) {
      const refused = await withCode('lessari', { email, code: wrong });
      expect(refused.statusCode).toBe(400);
      expect(refused.json()).toMatchObject({ errorCode: 'CUSTOMER_CODE_INVALID' });
    }
    expect((await withCode('lessari', { email, code })).json()).toMatchObject({ errorCode: 'CUSTOMER_CODE_INVALID' });
    // An e-mail with no account here is the same word, never "no such account".
    expect((await withCode('lessari', { email: newEmail('ninguem'), code })).json()).toMatchObject({ errorCode: 'CUSTOMER_CODE_INVALID' });
  });

  it('sends one code a minute: asked again inside it, the one on its way still holds', async () => {
    const email = newEmail('pressa');
    await identify('lessari', { name: 'Bia', email, phone: '11987654321' });
    await clearInbox();

    await identify('lessari', { name: 'Bia', email, phone: '11987654321' });
    const first = await waitForMessage(email);
    expect((await identify('lessari', { name: 'Bia', email, phone: '11987654321' })).json()).toEqual({ kind: 'CODE_SENT' });

    expect(await prisma.signInCode.count({ where: { user: { email } } })).toBe(1);
    expect((await withCode('lessari', { email, code: codeOf(first.Subject) })).statusCode).toBe(200);
  });

  it('sends another code from the code step once the minute passed, and answers the same for an e-mail with no account', async () => {
    const email = newEmail('reenvio');
    await identify('lessari', { name: 'Bia', email, phone: '11987654321' });
    await identify('lessari', { name: 'Bia', email, phone: '11987654321' });
    // The minute passes for the code standing.
    await prisma.signInCode.updateMany({ where: { user: { email } }, data: { createdAt: new Date(Date.now() - 61_000) } });
    await clearInbox();

    const resend = (address: string) => app.inject({ method: 'POST', url: '/api/stores/lessari/customer/checkout/code/resend', payload: { email: address } });
    expect((await resend(email)).statusCode).toBe(202);
    const second = await waitForMessage(email);
    expect((await resend(newEmail('ninguem'))).statusCode).toBe(202);

    // Only the last code holds.
    expect(await prisma.signInCode.count({ where: { user: { email }, usedAt: null } })).toBe(1);
    expect((await withCode('lessari', { email, code: codeOf(second.Subject) })).statusCode).toBe(200);
  });

  /** A shop's account is the shop's alone: the same e-mail is a new customer at another shop. */
  it('opens a second account for the same e-mail at another shop, and keeps a WhatsApp another record has as claimed', async () => {
    const email = newEmail('duas-lojas');
    await identify('lessari', { name: 'Bia', email, phone: '11987654321' });

    // The shopkeeper registered someone with this WhatsApp before: the purchase goes on, the pair flagged.
    const outra = await prisma.store.findUniqueOrThrow({ where: { slug: 'outra' } });
    await prisma.customer.create({ data: { storeId: outra.id, name: 'Venda pelo WhatsApp', phone: '5511987654321' } });

    const answer = (await identify('outra', { name: 'Bia', email, phone: '(11) 98765-4321' })).json<CustomerCheckoutAnswer>();
    expect(answer.kind).toBe('SESSION');
    const record = await prisma.customer.findFirstOrThrow({ where: { storeId: outra.id, user: { email } } });
    expect(record).toMatchObject({ phone: null, claimedPhone: '5511987654321' });
  });

  it('refuses a name, an e-mail or a WhatsApp that is not one', async () => {
    for (const payload of [
      { name: 'B', email: newEmail('x'), phone: '11987654321' },
      { name: 'Bia', email: 'nao-e-email', phone: '11987654321' },
      { name: 'Bia', email: newEmail('x'), phone: '1234' },
    ]) {
      expect((await identify('lessari', payload)).statusCode).toBe(400);
    }
    expect((await withCode('lessari', { email: newEmail('x'), code: '12345' })).statusCode).toBe(400);
  });
});
