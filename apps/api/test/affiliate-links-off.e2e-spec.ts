// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AffiliatePageOverview, AffiliateProgramOverview, ApiErrorBody, AuthSession, PublicAffiliateLink, PublicStore, ShopAffiliate } from '@harness-monorepo/contracts';

// App
import { EMPTY_AFFILIATE_PAGE_CONTENT } from '../src/modules/affiliates/affiliate-page.constants.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { affiliateDocumentFor, affiliateIdentity } from './support/affiliate-identity.js';
import { PASSWORD, newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported.
vi.hoisted(() => {
  process.env.AFFILIATE_LINKS_ENABLED = 'false';
});

/**
 * A deployment where links are not live yet (IMPULSEIA-105): production until the privacy policy
 * that tells of the cookie is out. Every link still opens the shop, and none credits anyone.
 */
describe('a deployment with AFFILIATE_LINKS_ENABLED off', () => {
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
    await call('POST', '/api/stores', owner, { name: 'Lessari', slug: 'lessari', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } });
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  it('answers an active affiliate of a shop whose programme is on as a link that credits nobody, and counts no visit', async () => {
    const { tables } = (await call('PUT', '/api/stores/lessari/affiliate-program', owner, { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null })).json<AffiliateProgramOverview>();
    const email = newEmail('joao');
    const joao = (await call('POST', '/api/stores/lessari/affiliates', owner, { ...affiliateIdentity(), document: await affiliateDocumentFor(prisma, '/api/stores/lessari/affiliates'), name: 'João Silva', email, tableId: tables[0]!.id })).json<ShopAffiliate>();
    const token = tokenFromLink((await waitForMessage(email.toLowerCase())).Text, '/afiliado/convite');
    expect((await call('POST', `/api/affiliate-invites/${token}/sign-up`, undefined, { name: 'João Silva', password: PASSWORD, slug: 'joao', pixKey: null, termsVersion: 0 })).statusCode).toBe(201);

    const link = await call('GET', '/api/stores/lessari/affiliate-link?slug=joao');
    expect(link.statusCode).toBe(200);
    expect(link.json<PublicAffiliateLink>()).toEqual({ affiliate: null });

    expect((await call('POST', '/api/stores/lessari/affiliate-visits', undefined, { affiliateId: joao.id })).statusCode).toBe(204);
    expect(await prisma.affiliateVisitDay.count()).toBe(0);
  });

  it('keeps the "Seja afiliado" page closed, opened and on, and says why to its owner (plan 2026-11-14)', async () => {
    await call('PUT', '/api/stores/lessari/affiliate-program', owner, { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null });
    const saved = await call('PUT', '/api/stores/lessari/affiliate-page', owner, {
      open: true,
      placements: { footerLink: true, topStrip: true },
      tableId: null,
      approval: 'AUTO',
      content: { ...EMPTY_AFFILIATE_PAGE_CONTENT },
    });
    expect(saved.json<AffiliatePageOverview>().blockedBy).toBe('LINKS_OFF');

    const page = await call('GET', '/api/stores/lessari/affiliate-join');
    expect(page.statusCode).toBe(404);
    expect(page.json<ApiErrorBody>().errorCode).toBe('AFFILIATE_PAGE_CLOSED');
    expect((await call('GET', '/api/stores/lessari/public')).json<PublicStore>().affiliatePage).toBeNull();
    const sent = await call('POST', '/api/stores/lessari/affiliate-join/applications', undefined, { name: 'Ana Souza', email: 'ana@exemplo.com', phone: '(11) 95555-4444', extraAnswer: null, accepted: true });
    expect(sent.statusCode).toBe(404);
    expect(await prisma.affiliateApplication.count()).toBe(0);
    expect(await prisma.affiliate.count()).toBe(0);
  });
});
