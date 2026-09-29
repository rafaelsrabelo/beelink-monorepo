// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerProfile, CustomerSavedAddress, StoreCustomer, StoreCustomerDetail, StoreCustomerPage } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const home = { label: 'Casa', zipCode: '60160-230', street: 'Rua Tibúrcio Cavalcante', number: '1200', complement: 'apto 302', neighborhood: 'Meireles', city: 'Fortaleza', state: 'ce' };
const work = { label: 'Trabalho', recipientName: 'Rafa na recepção', zipCode: '60150162', street: 'Av. Santos Dumont', number: '3000', city: 'Fortaleza', state: 'CE' };

describe("a shopper's saved addresses at a shop", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;

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
    for (const slug of ['lessari', 'outra']) await call('POST', '/api/stores', owner, shopBody(slug));
    shopper = await shopperOf('lessari', 'Rafael Souza');
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function shopperOf(slug: string, name: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${slug}/customer/register`, undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    return (await call('POST', `/api/stores/${slug}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
  }

  const url = (rest = '', slug = 'lessari') => `/api/stores/${slug}/customer/addresses${rest}`;
  const save = async (payload: object, session = shopper): Promise<CustomerSavedAddress> => {
    const response = await call('POST', url(), session, payload);
    if (response.statusCode !== 201) throw new Error(`POST addresses answered ${response.statusCode}: ${response.payload}`);
    return response.json<CustomerSavedAddress>();
  };
  const listOf = async (session = shopper) => (await call('GET', url(), session)).json<CustomerSavedAddress[]>();
  const meOf = async (session = shopper) => (await call('GET', '/api/stores/lessari/customer/me', session)).json<CustomerProfile>();
  const defaultsOf = async () => (await listOf()).filter((address) => address.isDefault).map((address) => address.label);

  it('makes the first address the default, lists the default first, and reads it in the profile', async () => {
    const first = await save({ ...work, isDefault: false });
    expect(first).toMatchObject({ label: 'Trabalho', recipientName: 'Rafa na recepção', state: 'CE', isDefault: true, complement: null });

    const second = await save(home);
    expect(second).toMatchObject({ label: 'Casa', recipientName: null, isDefault: false });

    expect((await listOf()).map((address) => address.label)).toEqual(['Trabalho', 'Casa']);
    const me = await meOf();
    expect(me.addresses.map((address) => address.id)).toEqual([first.id, second.id]);
    // The profile's `address` is the default's parts, as the panel and the cart read it.
    expect(me.address).toEqual({ zipCode: '60150162', street: 'Av. Santos Dumont', number: '3000', complement: null, neighborhood: null, city: 'Fortaleza', state: 'CE' });

    const third = await save({ ...home, label: 'Mãe', isDefault: true });
    expect(third.isDefault).toBe(true);
    expect(await defaultsOf()).toEqual(['Mãe']);
  });

  it('replaces an address whole, moves the default on request, and never away by a save', async () => {
    const first = await save(home);
    const second = await save(work);

    const replaced = await call('PUT', url(`/${first.id}`), shopper, { ...home, complement: '', label: '  ', isDefault: false });
    expect(replaced.statusCode).toBe(200);
    // Blank is not given; the default stays where it was.
    expect(replaced.json<CustomerSavedAddress>()).toMatchObject({ label: null, complement: null, isDefault: true });

    await call('PUT', url(`/${second.id}`), shopper, { ...work, isDefault: true });
    expect((await listOf()).map((address) => [address.id, address.isDefault])).toEqual([
      [second.id, true],
      [first.id, false],
    ]);
  });

  it('makes one the default, and removing the default promotes the one changed last; the last leaves none', async () => {
    const first = await save(home);
    const second = await save(work);
    const third = await save({ ...home, label: 'Mãe' });

    const made = await call('POST', url(`/${second.id}/default`), shopper);
    expect(made.statusCode).toBe(200);
    expect(await defaultsOf()).toEqual(['Trabalho']);
    // Asked again, nothing moves.
    expect((await call('POST', url(`/${second.id}/default`), shopper)).json<CustomerSavedAddress>().isDefault).toBe(true);

    await call('PUT', url(`/${first.id}`), shopper, home);
    expect((await call('DELETE', url(`/${second.id}`), shopper)).statusCode).toBe(204);
    expect(await defaultsOf()).toEqual(['Casa']);

    await call('DELETE', url(`/${first.id}`), shopper);
    await call('DELETE', url(`/${third.id}`), shopper);
    const me = await meOf();
    expect(me.addresses).toEqual([]);
    expect(me.address).toEqual({ zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null });
  });

  it('promotes one a delivery can go to, and a merge moves addresses without making them the newest', async () => {
    await save(home);
    await save(work);
    // A record the shopkeeper typed with a city alone, merged into the shopper's: it arrives last.
    const typed = (await call('POST', '/api/stores/lessari/customers', owner, { name: 'Rafael', phone: '85988887777', address: { city: 'Niterói' } })).json<StoreCustomer>();
    const merged = await call('POST', `/api/stores/lessari/customers/${typed.id}/merge`, owner, { otherId: (await meOf()).id });
    expect(merged.statusCode).toBe(200);
    expect((await listOf()).map((address) => [address.city, address.isDefault])).toEqual([
      ['Fortaleza', true],
      ['Niterói', false],
      ['Fortaleza', false],
    ]);

    const casa = (await listOf()).find((address) => address.label === 'Casa')!;
    await call('DELETE', url(`/${casa.id}`), shopper);
    // Trabalho, which a delivery can reach, and not the city the shopkeeper once typed.
    expect(await defaultsOf()).toEqual(['Trabalho']);
  });

  it('refuses an address with no ZIP code, street, city or state, or a malformed one, saving nothing', async () => {
    for (const payload of [
      { ...home, zipCode: '6016' },
      { ...home, street: '   ' },
      { ...home, city: undefined },
      { ...home, state: 'Ceará' },
      { ...home, label: 'x'.repeat(41) },
      { ...home, isDefault: 'sim' },
      { ...home, customerId: 'outro' },
    ]) {
      const response = await call('POST', url(), shopper, payload);
      expect(response.statusCode, JSON.stringify(payload)).toBe(400);
    }
    expect(await listOf()).toEqual([]);
  });

  it('keeps at most ten', async () => {
    for (let index = 0; index < 10; index += 1) await save({ ...home, label: `Endereço ${index + 1}` });

    const eleventh = await call('POST', url(), shopper, home);
    expect(eleventh.statusCode).toBe(409);
    expect(eleventh.json()).toMatchObject({ errorCode: 'CUSTOMER_ADDRESS_LIMIT' });
    expect(await listOf()).toHaveLength(10);
  });

  it("answers another shopper's address, another shop's and an id that is none as not found, and needs a shopper", async () => {
    const mine = await save(home);
    const stranger = await shopperOf('lessari', 'Outra Pessoa');
    const elsewhere = await shopperOf('outra', 'Rafael Souza');
    const theirs = await save(work, stranger);

    for (const [method, path] of [
      ['PUT', `/${theirs.id}`],
      ['DELETE', `/${theirs.id}`],
      ['POST', `/${theirs.id}/default`],
      ['PUT', '/nao-e-um-id'],
      ['DELETE', '/01a0ffff-ffff-7fff-bfff-ffffffffffff'],
    ] as const) {
      const response = await call(method, url(path), shopper, method === 'PUT' ? home : undefined);
      expect(response.statusCode, `${method} ${path}`).toBe(404);
      expect(response.json(), `${method} ${path}`).toMatchObject({ errorCode: 'CUSTOMER_ADDRESS_NOT_FOUND' });
    }
    // The same person at another shop is another record, with none of these.
    expect((await call('DELETE', url(`/${mine.id}`, 'outra'), elsewhere)).statusCode).toBe(404);
    expect((await listOf(stranger)).map((address) => address.label)).toEqual(['Trabalho']);

    expect((await call('GET', url())).statusCode).toBe(401);
    expect((await call('GET', url(), owner)).statusCode).toBe(401);
  });

  it("is the panel's one address: the record and the list read the default, and a correction writes it", async () => {
    await save(home);
    await save(work, shopper);
    const [row] = (await call('GET', '/api/stores/lessari/customers', owner)).json<StoreCustomerPage>().customers;
    expect(row).toMatchObject({ name: 'Rafael Souza', city: 'Fortaleza', state: 'CE' });

    const record = (await call('GET', `/api/stores/lessari/customers/${row!.id}`, owner)).json<StoreCustomerDetail>();
    expect(record.address).toMatchObject({ street: 'Rua Tibúrcio Cavalcante', complement: 'apto 302' });

    const corrected = await call('PATCH', `/api/stores/lessari/customers/${row!.id}`, owner, { address: { number: '1210' } });
    expect(corrected.json<StoreCustomerDetail>().address).toMatchObject({ street: 'Rua Tibúrcio Cavalcante', number: '1210' });
    expect((await listOf()).map((address) => [address.label, address.number])).toEqual([
      ['Casa', '1210'],
      ['Trabalho', '3000'],
    ]);

    // Cleared part by part down to nothing, the default is gone and the other address takes its place.
    const nothing = { zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null };
    await call('PATCH', `/api/stores/lessari/customers/${row!.id}`, owner, { address: nothing });
    expect(await defaultsOf()).toEqual(['Trabalho']);
  });

  it('gives a customer the panel registers with an address that address as their default, and none without', async () => {
    const withOne = (await call('POST', '/api/stores/lessari/customers', owner, { name: 'Rita', phone: '11966665555', address: { city: 'Campinas', state: 'sp' } })).json<StoreCustomer>();
    const without = (await call('POST', '/api/stores/lessari/customers', owner, { name: 'Caio', phone: '11955554444', address: { city: '' } })).json<StoreCustomer>();

    expect(withOne).toMatchObject({ city: 'Campinas', state: 'SP' });
    expect(await prisma.customerAddress.findMany({ where: { customerId: withOne.id } })).toMatchObject([{ city: 'Campinas', isDefault: true, label: null }]);
    expect(await prisma.customerAddress.count({ where: { customerId: without.id } })).toBe(0);
  });
});
