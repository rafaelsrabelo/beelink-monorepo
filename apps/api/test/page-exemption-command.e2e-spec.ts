// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import type { Prisma } from '../src/generated/prisma/client.js';
import { COMMAND_EXIT } from '../src/modules/billing/billing-command.js';
import { runPageExemptionCommand } from '../src/modules/billing/page-exemption.command.js';
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { resetDatabase } from './support/reset-database.js';

// Charging on, with a key of bee-link's own (the fake's): pages lock here, so exempting one is seen to open it.
vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'true';
});

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');
const DAY = 86_400_000;

/** Exempting pages from the api container's terminal (BEELINK-297). */
describe('the command that exempts pages', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PlatformAsaas).useValue(new FakePlatformAsaas()));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
  });

  /** The command as the terminal runs it: what it wrote, out and err, and how it exited. */
  async function run(...argv: string[]) {
    const out: string[] = [];
    const err: string[] = [];
    const exit = await runPageExemptionCommand(argv, prisma, { out: (line) => out.push(line), err: (line) => err.push(line) });
    return { exit, out: out.join('\n'), err: err.join('\n') };
  }

  async function openShop(slug: string): Promise<void> {
    const response = await app.inject({ method: 'POST', url: '/api/stores', headers: { authorization: `Bearer ${owner.accessToken}` }, payload: { name: `Teste S15 ${slug}`, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } } });
    if (response.statusCode !== 201) throw new Error(`POST /stores answered ${response.statusCode}: ${response.payload}`);
  }

  const panelRead = (slug: string) => app.inject({ method: 'GET', url: `/api/stores/${slug}`, headers: { authorization: `Bearer ${owner.accessToken}` } });
  const subscriptionOf = async (slug: string) =>
    (await app.inject({ method: 'GET', url: `/api/stores/${slug}/subscription`, headers: { authorization: `Bearer ${owner.accessToken}` } })).json<StoreSubscriptionAnswer>().subscription;
  const rowOf = (slug: string) => prisma.storeSubscription.findFirstOrThrow({ where: { store: { slug } } });
  const setRow = (slug: string, data: Prisma.StoreSubscriptionUpdateManyMutationInput) => prisma.storeSubscription.updateMany({ where: { store: { slug } }, data });
  const expireTrial = (slug: string) => setRow(slug, { trialStartedAt: new Date(Date.now() - 9 * DAY), trialEndsAt: new Date(Date.now() - DAY) });

  async function lockedReason(slug: string): Promise<string | null> {
    const response = await panelRead(slug);
    if (response.statusCode === 200) return null;
    return response.json<ApiErrorBody>().errorCode;
  }

  describe('exempt', () => {
    it('opens a page locked for its trial at once, and the page reads exempt', async () => {
      await openShop('teste-isenta');
      await expireTrial('teste-isenta');
      expect(await lockedReason('teste-isenta')).toBe('PAGE_LOCKED');

      const { exit, out } = await run('exempt', '--slug', 'Teste-Isenta ');

      expect(exit).toBe(COMMAND_EXIT.done);
      expect(out).toContain('Exempted teste-isenta (Teste S15 teste-isenta)');
      expect(await lockedReason('teste-isenta')).toBeNull();
      expect(await subscriptionOf('teste-isenta')).toMatchObject({ status: 'EXEMPT', lock: null });
    });

    it('writes the status alone: the trial and a free month stay on the row', async () => {
      await openShop('teste-mes');
      const freeEnd = new Date(Date.now() + 20 * DAY);
      await setRow('teste-mes', { freePeriodEndsAt: freeEnd });
      const before = await rowOf('teste-mes');

      await run('exempt', '--slug', 'teste-mes');

      const after = await rowOf('teste-mes');
      expect(after).toEqual({ ...before, status: 'EXEMPT', updatedAt: after.updatedAt });
    });

    it('exempts a page with an unpaid subscription at Asaas, and says that subscription stands there', async () => {
      await openShop('teste-fatura');
      await setRow('teste-fatura', { asaasSubscriptionId: 'sub_teste_s15_fatura' });

      const { exit, out } = await run('exempt', '--slug', 'teste-fatura');

      expect(exit).toBe(COMMAND_EXIT.done);
      expect(out).toContain('never paid: that subscription stands there');
      expect(await rowOf('teste-fatura')).toMatchObject({ status: 'EXEMPT', asaasSubscriptionId: 'sub_teste_s15_fatura' });
    });

    it.each([
      ['ACTIVE', { status: 'ACTIVE' as const, currentPeriodEndsAt: new Date(Date.now() + 20 * DAY) }],
      ['PAST_DUE', { status: 'PAST_DUE' as const, currentPeriodEndsAt: new Date(Date.now() - DAY) }],
      ['SUSPENDED', { status: 'SUSPENDED' as const, currentPeriodEndsAt: new Date(Date.now() - 20 * DAY) }],
      ['CANCELED', { status: 'CANCELED' as const, currentPeriodEndsAt: new Date(Date.now() - DAY) }],
    ])('refuses a page that paid before (%s), and writes nothing', async (_status, data) => {
      await openShop('teste-paga');
      await setRow('teste-paga', { ...data, asaasSubscriptionId: 'sub_teste_s15_paga' });
      const before = await rowOf('teste-paga');

      const { exit, err } = await run('exempt', '--slug', 'teste-paga');

      expect(exit).toBe(COMMAND_EXIT.refused);
      expect(err).toContain('paid for its plan before');
      expect(await rowOf('teste-paga')).toEqual(before);
    });

    it('refuses while its owner is choosing a plan for it, and writes nothing', async () => {
      await openShop('teste-escolha');
      await setRow('teste-escolha', { asaasSubscriptionClaimedUntil: new Date(Date.now() + 60_000) });

      const { exit, err } = await run('exempt', '--slug', 'teste-escolha');

      expect(exit).toBe(COMMAND_EXIT.refused);
      expect(err).toContain('choosing a plan for it right now');
      expect((await rowOf('teste-escolha')).status).toBe('TRIALING');
    });

    it('says so of a page exempt already, and changes nothing', async () => {
      await openShop('teste-ja');
      await run('exempt', '--slug', 'teste-ja');
      const before = await rowOf('teste-ja');

      expect(await run('exempt', '--slug', 'teste-ja')).toMatchObject({ exit: COMMAND_EXIT.done, out: 'teste-ja is exempt already.' });
      expect(await rowOf('teste-ja')).toEqual(before);
    });

    it('refuses an address no page has, and a page with no subscription', async () => {
      expect(await run('exempt', '--slug', 'teste-ninguem')).toMatchObject({ exit: COMMAND_EXIT.refused, err: 'No page has the address teste-ninguem.' });

      await openShop('teste-sem-linha');
      await prisma.storeSubscription.deleteMany({ where: { store: { slug: 'teste-sem-linha' } } });
      const { exit, err } = await run('exempt', '--slug', 'teste-sem-linha');
      expect(exit).toBe(COMMAND_EXIT.refused);
      expect(err).toContain('has no subscription');
      expect(await prisma.storeSubscription.count()).toBe(0);
    });
  });

  describe('unexempt', () => {
    it('makes it a page that never paid again: locked where its trial is over, open while a free month runs', async () => {
      await openShop('teste-volta');
      await expireTrial('teste-volta');
      await run('exempt', '--slug', 'teste-volta');

      const { exit, out } = await run('unexempt', '--slug', 'teste-volta');

      expect(exit).toBe(COMMAND_EXIT.done);
      expect(out).toContain('Unexempted teste-volta (Teste S15 teste-volta): it stands TRIAL_EXPIRED: it locks at once wherever charging is on');
      expect((await rowOf('teste-volta')).status).toBe('TRIALING');
      expect(await lockedReason('teste-volta')).toBe('PAGE_LOCKED');

      const freeEnd = new Date(Date.now() + 20 * DAY);
      await setRow('teste-volta', { freePeriodEndsAt: freeEnd });
      await run('exempt', '--slug', 'teste-volta');
      expect((await run('unexempt', '--slug', 'teste-volta')).out).toMatch(/it stands TRIAL_EXPIRED, free until \d{4}-\d{2}-\d{2}\.$/);
      expect(await lockedReason('teste-volta')).toBeNull();
    });

    it('says so of a page that is not exempt, and changes nothing', async () => {
      await openShop('teste-nao');
      const before = await rowOf('teste-nao');

      expect(await run('unexempt', '--slug', 'teste-nao')).toMatchObject({ exit: COMMAND_EXIT.done, out: 'teste-nao is not exempt: it stands TRIALING.' });
      expect(await rowOf('teste-nao')).toEqual(before);
    });

    it('refuses a page made exempt by hand after it paid: where it stands is not guessed', async () => {
      await openShop('teste-mao');
      await setRow('teste-mao', { status: 'EXEMPT', currentPeriodEndsAt: new Date(Date.now() + 20 * DAY) });

      const { exit, err } = await run('unexempt', '--slug', 'teste-mao');

      expect(exit).toBe(COMMAND_EXIT.refused);
      expect(err).toContain('paid for a period before it was made exempt');
      expect((await rowOf('teste-mao')).status).toBe('EXEMPT');
    });
  });

  it('lists the exempt pages by address, with the day each was created', async () => {
    expect(await run('list')).toMatchObject({ exit: COMMAND_EXIT.done, out: 'No page is exempt.' });
    await openShop('teste-b');
    await openShop('teste-a');
    await openShop('teste-c');
    await run('exempt', '--slug', 'teste-b');
    await run('exempt', '--slug', 'teste-a');

    const lines = (await run('list')).out.split('\n');

    expect(lines[0]).toMatch(/^SLUG +CREATED +NAME$/);
    expect(lines.slice(1).map((line) => line.split(/ {2,}/))).toEqual([
      ['teste-a', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'Teste S15 teste-a'],
      ['teste-b', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'Teste S15 teste-b'],
    ]);
  });

  it.each([
    ['nothing', []],
    ['a command it does not know', ['remove', '--slug', 'teste-x']],
    ['no address', ['exempt']],
    ['an option it does not know', ['exempt', '--page', 'teste-x']],
    ['an address twice', ['exempt', '--slug', 'teste-x', '--slug', 'teste-y']],
  ])('says how it is used when given %s', async (_what, argv) => {
    const { exit, out, err } = await run(...argv);

    expect(exit).toBe(COMMAND_EXIT.usage);
    expect(`${out}${err}`).toContain('node dist/scripts/page-exemption.js exempt --slug <SLUG>');
  });

  it('says how it is used when asked for help', async () => {
    expect(await run('help')).toMatchObject({ exit: COMMAND_EXIT.done, out: expect.stringContaining('node dist/scripts/page-exemption.js list') });
  });
});
