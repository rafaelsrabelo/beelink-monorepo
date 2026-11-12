// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AffiliateProgramOverview, ApiErrorBody, AuthSession, PublicAffiliateLink, ShopAffiliate } from '@harness-monorepo/contracts';

// App
import { FunnelRetention } from '../src/modules/reports/funnel-retention.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const MISSING = '0199a1b2-0000-7000-8000-000000000000';
const DAY = 24 * 60 * 60 * 1000;
const PROGRAM_ON = { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null };

describe("an affiliate's link on the shop window, and the visits it brings (IMPULSEIA-105)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;

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
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await call('POST', '/api/stores', stranger, shopBody('vizinha'));
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const errorOf = (response: { json<T>(): T }) => response.json<ApiErrorBody>().errorCode;
  const linkOf = (query: string, shop = 'lessari') => call('GET', `/api/stores/${shop}/affiliate-link?${query}`);
  const affiliateOf = async (query: string, shop = 'lessari') => (await linkOf(query, shop)).json<PublicAffiliateLink>().affiliate;
  const visit = (affiliateId: string, shop = 'lessari') => call('POST', `/api/stores/${shop}/affiliate-visits`, undefined, { affiliateId });
  const visitsOf = async (affiliateId: string) => (await prisma.affiliateVisitDay.aggregate({ where: { affiliateId }, _sum: { visits: true } }))._sum.visits ?? 0;

  async function programOn(shop = 'lessari', session = owner): Promise<string> {
    const overview = (await call('PUT', `/api/stores/${shop}/affiliate-program`, session, PROGRAM_ON)).json<AffiliateProgramOverview>();
    return overview.tables[0]!.id;
  }

  /** An affiliate through the real door: invited by the shop, signed up by the invite's link. */
  async function affiliate(slug: string, shop = 'lessari', session = owner): Promise<ShopAffiliate> {
    const tableId = (await call('GET', `/api/stores/${shop}/affiliate-program`, session)).json<AffiliateProgramOverview>().tables[0]!.id;
    const email = newEmail(slug);
    const invited = await call('POST', `/api/stores/${shop}/affiliates`, session, { name: 'João Silva', email, tableId });
    if (invited.statusCode !== 201) throw new Error(`POST affiliates answered ${invited.statusCode}: ${invited.payload}`);
    const token = tokenFromLink((await waitForMessage(email.toLowerCase())).Text, '/afiliado/convite');
    const accepted = await call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name: 'João Silva', password: PASSWORD, slug, pixKey: null, termsVersion: 0 });
    if (accepted.statusCode !== 201) throw new Error(`sign-up answered ${accepted.statusCode}: ${accepted.payload}`);
    return invited.json<ShopAffiliate>();
  }

  describe('whom a link names', () => {
    it('answers an active affiliate of a shop whose programme is on — what the window shows, and nothing more — by name and by id', async () => {
      await programOn();
      const joao = await affiliate('joao');
      await prisma.affiliate.update({ where: { id: joao.id }, data: { tagline: 'Meus favoritos da loja', photoUrl: 'https://cdn.example/joao.jpg' } });

      const response = await linkOf('slug=joao');
      expect(response.statusCode).toBe(200);
      expect(response.json<PublicAffiliateLink>()).toEqual({
        affiliate: { id: joao.id, slug: 'joao', name: 'João Silva', photoUrl: 'https://cdn.example/joao.jpg', tagline: 'Meus favoritos da loja', attributionDays: 30 },
      });
      expect(await affiliateOf(`id=${joao.id}`)).toMatchObject({ slug: 'joao' });
      expect(await affiliateOf(`id=${joao.id.toUpperCase()}`)).toMatchObject({ slug: 'joao' });
    });

    it('reads the name as it is kept, so the case and the accents of an address do not matter', async () => {
      await programOn();
      await affiliate('joao');

      expect(await affiliateOf('slug=JOAO')).toMatchObject({ slug: 'joao' });
      expect(await affiliateOf(`slug=${encodeURIComponent('João')}`)).toMatchObject({ slug: 'joao' });
    });

    it("answers nobody — and still a link — while the programme is off, or the affiliate paused or ended", async () => {
      const joao = await affiliate('joao');
      const nobody = async () => {
        const response = await linkOf('slug=joao');
        expect(response.statusCode).toBe(200);
        return response.json<PublicAffiliateLink>().affiliate;
      };

      expect(await nobody()).toBeNull();
      await programOn();
      expect(await nobody()).not.toBeNull();

      await call('POST', `/api/stores/lessari/affiliates/${joao.id}/pause`, owner);
      expect(await nobody()).toBeNull();
      await call('POST', `/api/stores/lessari/affiliates/${joao.id}/resume`, owner);
      expect(await nobody()).not.toBeNull();
      await call('POST', `/api/stores/lessari/affiliates/${joao.id}/end`, owner);
      expect(await nobody()).toBeNull();
      expect(await affiliateOf(`id=${joao.id}`)).toBeNull();
    });

    it.each([
      ['a name nobody has', 'slug=maria'],
      ['an id nobody has', `id=${MISSING}`],
      ['an id that is no id', 'id=nao-e-um-id'],
      ['a name that keeps to nothing', 'slug=---'],
      ['both at once', `slug=joao&id=${MISSING}`],
      ['neither', ''],
    ])('answers %s as no link of the shop', async (_, query) => {
      await programOn();
      await affiliate('joao');

      const response = await linkOf(query);
      expect(response.statusCode).toBe(404);
      expect(errorOf(response)).toBe('AFFILIATE_LINK_NOT_FOUND');
    });

    it("answers an invited affiliate, who has no link yet, and another shop's, as no link of this shop", async () => {
      await programOn();
      const tableId = (await call('GET', '/api/stores/lessari/affiliate-program', owner)).json<AffiliateProgramOverview>().tables[0]!.id;
      const invited = (await call('POST', '/api/stores/lessari/affiliates', owner, { name: 'Maria', email: newEmail('maria'), tableId })).json<ShopAffiliate>();
      await programOn('vizinha', stranger);
      const theirs = await affiliate('delas', 'vizinha', stranger);

      expect(errorOf(await linkOf(`id=${invited.id}`))).toBe('AFFILIATE_LINK_NOT_FOUND');
      expect(errorOf(await linkOf(`id=${theirs.id}`))).toBe('AFFILIATE_LINK_NOT_FOUND');
      expect(errorOf(await linkOf('slug=delas'))).toBe('AFFILIATE_LINK_NOT_FOUND');
      expect(await affiliateOf('slug=delas', 'vizinha')).toMatchObject({ slug: 'delas' });
    });

    it('answers a shop that does not exist as such, and refuses a field it does not take', async () => {
      expect(errorOf(await linkOf('slug=joao', 'ninguem'))).toBe('STORE_NOT_FOUND');
      expect((await linkOf('slug=joao&utm_source=x')).statusCode).toBe(400);
    });
  });

  describe('the visits', () => {
    it('counts a visit a time, on the day, and visits at the same instant add up', async () => {
      await programOn();
      const joao = await affiliate('joao');

      expect((await visit(joao.id)).statusCode).toBe(204);
      await Promise.all(Array.from({ length: 5 }, () => visit(joao.id)));

      const rows = await prisma.affiliateVisitDay.findMany({ where: { affiliateId: joao.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ visits: 6, storeId: (await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } })).id });
    });

    it('counts nothing for a link that credits nobody, and says so to nobody', async () => {
      const joao = await affiliate('joao');
      expect((await visit(joao.id)).statusCode).toBe(204);

      await programOn();
      await call('POST', `/api/stores/lessari/affiliates/${joao.id}/pause`, owner);
      expect((await visit(joao.id)).statusCode).toBe(204);
      expect((await visit(MISSING)).statusCode).toBe(204);

      await programOn('vizinha', stranger);
      const theirs = await affiliate('delas', 'vizinha', stranger);
      expect((await visit(theirs.id, 'lessari')).statusCode).toBe(204);
      expect((await visit(joao.id, 'ninguem')).statusCode).toBe(204);

      expect(await prisma.affiliateVisitDay.count()).toBe(0);
    });

    it('takes the affiliate and nothing else', async () => {
      await programOn();
      const joao = await affiliate('joao');

      expect((await visit('nao-e-um-id')).statusCode).toBe(400);
      expect((await call('POST', '/api/stores/lessari/affiliate-visits', undefined, { affiliateId: joao.id, visitor: 'x' })).statusCode).toBe(400);
      expect(await visitsOf(joao.id)).toBe(0);
    });

    it("goes with the funnel's counters once it is thirteen months old", async () => {
      await programOn();
      const joao = await affiliate('joao');
      const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } });
      const now = new Date('2027-12-15T15:00:00Z');
      await prisma.affiliateVisitDay.createMany({
        data: [
          { affiliateId: joao.id, storeId, day: new Date('2026-11-14'), visits: 3 },
          { affiliateId: joao.id, storeId, day: new Date('2026-11-15'), visits: 2 },
          { affiliateId: joao.id, storeId, day: new Date(now.getTime() - DAY), visits: 1 },
        ],
      });

      expect(await app.get(FunnelRetention).prune(now)).toBe(1);
      expect(await visitsOf(joao.id)).toBe(3);
    });
  });
});
