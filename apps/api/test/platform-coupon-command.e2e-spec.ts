// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, Store } from '@harness-monorepo/contracts';

// App
import { COMMAND_EXIT, runPlatformCouponCommand } from '../src/modules/billing/platform-coupon.command.js';
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { resetDatabase } from './support/reset-database.js';

vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'true';
});

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');
const DAY = 86_400_000;

/** The day it is in Brasília, worked out here and not by the API's own functions. */
const today = (): string => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
const plusDays = (day: string, days: number): string => new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY).toISOString().slice(0, 10);
/** The midnight in Brasília that closes a day. */
const closeOf = (day: string): Date => new Date(Date.parse(`${day}T03:00:00.000Z`) + DAY);

/** bee-link's coupons made, listed and switched off from the api container's terminal (BEELINK-224). Every code here says TESTE. */
describe("the command that makes bee-link's coupons", () => {
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

  /** The command as the terminal runs it: what it wrote, out and err, and how it exited. */
  async function run(...argv: string[]) {
    const out: string[] = [];
    const err: string[] = [];
    const exit = await runPlatformCouponCommand(argv, prisma, { out: (line) => out.push(line), err: (line) => err.push(line) });
    return { exit, out: out.join('\n'), err: err.join('\n') };
  }

  async function openShop(slug: string): Promise<Store> {
    const response = await app.inject({ method: 'POST', url: '/api/stores', headers: { authorization: `Bearer ${owner.accessToken}` }, payload: { name: `Loja ${slug}`, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } } });
    if (response.statusCode !== 201) throw new Error(`POST /stores answered ${response.statusCode}: ${response.payload}`);
    return response.json<Store>();
  }

  const redeem = (code: string, slug: string) => app.inject({ method: 'POST', url: `/api/stores/${slug}/subscription/coupon`, headers: { authorization: `Bearer ${owner.accessToken}` }, payload: { code } });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
  });

  describe('create', () => {
    it("makes a coupon with its code in upper case, its last day closing at Brasília's midnight, and its limit", async () => {
      const lastDay = plusDays(today(), 30);

      const { exit, out } = await run('create', '--code', 'teste-cmd', '--expires', lastDay, '--max-uses', '5');

      expect(exit).toBe(COMMAND_EXIT.done);
      expect(await prisma.platformCoupon.findMany()).toEqual([expect.objectContaining({ code: 'TESTE-CMD', expiresAt: closeOf(lastDay), maxRedemptions: 5, redemptionCount: 0, disabledAt: null })]);
      expect(out).toContain('Created TESTE-CMD');
      expect(out).toContain(`Last day: ${lastDay} (Brasília)`);
      expect(out).toContain('up to 5');
    });

    it('makes one with no last day and no limit, the options written either way', async () => {
      const { exit, out } = await run('create', '--code=TESTE-LIVRE');

      expect(exit).toBe(COMMAND_EXIT.done);
      expect(await prisma.platformCoupon.findUniqueOrThrow({ where: { code: 'TESTE-LIVRE' } })).toMatchObject({ expiresAt: null, maxRedemptions: null });
      expect(out).toContain('never expires');
      expect(out).toContain('no limit');
    });

    it('takes today as the last day: the coupon holds until the day is over', async () => {
      expect((await run('create', '--code', 'TESTE-HOJE', '--expires', today())).exit).toBe(COMMAND_EXIT.done);
      expect((await prisma.platformCoupon.findUniqueOrThrow({ where: { code: 'TESTE-HOJE' } })).expiresAt).toEqual(closeOf(today()));
    });

    it('refuses a code already taken, whatever its case, and makes nothing', async () => {
      await run('create', '--code', 'TESTE-DUPLO');

      const { exit, err } = await run('create', '--code', 'teste-duplo', '--max-uses', '3');

      expect(exit).toBe(COMMAND_EXIT.refused);
      expect(err).toContain('already exists');
      expect(await prisma.platformCoupon.findMany()).toEqual([expect.objectContaining({ code: 'TESTE-DUPLO', maxRedemptions: null })]);
    });

    it.each([
      ['a code no coupon could have', ['--code', 'te'], 'The code must be'],
      ['a code with a space', ['--code', 'teste mes'], 'The code must be'],
      ['a last day gone by', ['--code', 'TESTE-X', '--expires', plusDays(today(), -1)], 'already over'],
      ['a day that is no day', ['--code', 'TESTE-X', '--expires', '2027-02-30'], 'must be a day'],
      ['a day written otherwise', ['--code', 'TESTE-X', '--expires', '31/12/2027'], 'must be a day'],
      ['no pages at all', ['--code', 'TESTE-X', '--max-uses', '0'], 'whole number'],
      ['part of a page', ['--code', 'TESTE-X', '--max-uses', '1.5'], 'whole number'],
      ['a word for a limit', ['--code', 'TESTE-X', '--max-uses', 'dez'], 'whole number'],
      ['more pages than any coupon may have', ['--code', 'TESTE-X', '--max-uses', '1000001'], 'whole number'],
    ])('refuses %s, and makes nothing', async (_what, args, said) => {
      const { exit, err } = await run('create', ...args);

      expect(exit).toBe(COMMAND_EXIT.refused);
      expect(err).toContain(said);
      expect(await prisma.platformCoupon.count()).toBe(0);
    });

    it.each([
      ['no code', ['create']],
      ['an option it does not know', ['create', '--code', 'TESTE-X', '--months', '2']],
      ['an option twice', ['create', '--code', 'TESTE-X', '--code', 'TESTE-Y']],
      ['an option with no value', ['create', '--code']],
      ['a command it does not know', ['delete', '--code', 'TESTE-X']],
    ])('says how it is used when asked with %s, and makes nothing', async (_what, argv) => {
      const { exit, err } = await run(...argv);

      expect(exit).toBe(COMMAND_EXIT.usage);
      expect(err).toContain('Usage');
      expect(await prisma.platformCoupon.count()).toBe(0);
    });
  });

  describe('list', () => {
    it('says there are none yet', async () => {
      expect(await run('list')).toMatchObject({ exit: COMMAND_EXIT.done, out: 'No coupons yet.' });
    });

    it('lists every coupon, the newest first, with where each stands and how many pages used it', async () => {
      await run('create', '--code', 'TESTE-ATIVO', '--max-uses', '10', '--expires', plusDays(today(), 10));
      await run('create', '--code', 'TESTE-DESLIGADO');
      await run('disable', '--code', 'TESTE-DESLIGADO');
      await prisma.platformCoupon.create({ data: { code: 'TESTE-VENCIDO', expiresAt: new Date(Date.now() - 1_000), createdAt: new Date(Date.now() + 1_000) } });
      await prisma.platformCoupon.create({ data: { code: 'TESTE-ESGOTADO', maxRedemptions: 2, redemptionCount: 2, createdAt: new Date(Date.now() + 2_000) } });
      await prisma.platformCoupon.update({ where: { code: 'TESTE-ATIVO' }, data: { redemptionCount: 3 } });

      const { exit, out } = await run('list');

      expect(exit).toBe(COMMAND_EXIT.done);
      const lines = out.split('\n');
      expect(lines[0]).toMatch(/^CODE +STATE +LAST DAY +PAGES +CREATED$/);
      expect(lines.slice(1).map((line) => line.split(/ {2,}/).slice(0, 4))).toEqual([
        ['TESTE-ESGOTADO', 'used up', 'no end', '2 of 2'],
        ['TESTE-VENCIDO', 'expired', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), '0 (no limit)'],
        ['TESTE-DESLIGADO', 'disabled', 'no end', '0 (no limit)'],
        ['TESTE-ATIVO', 'active', plusDays(today(), 10), '3 of 10'],
      ]);
    });
  });

  describe('disable', () => {
    it('switches a coupon off: no page uses it from then on, and the month it gave stays given', async () => {
      await run('create', '--code', 'TESTE-PAUSA');
      await openShop('padaria');
      await openShop('adega');
      expect((await redeem('TESTE-PAUSA', 'padaria')).statusCode).toBe(200);
      const given = (await prisma.storeSubscription.findFirstOrThrow({ where: { store: { slug: 'padaria' } } })).freePeriodEndsAt;

      const { exit, out } = await run('disable', '--code', 'teste-pausa');

      expect(exit).toBe(COMMAND_EXIT.done);
      expect(out).toContain('Disabled TESTE-PAUSA');
      const refused = await redeem('TESTE-PAUSA', 'adega');
      expect([refused.statusCode, refused.json<ApiErrorBody>().errorCode]).toEqual([409, 'BILLING_COUPON_DISABLED']);
      expect((await prisma.storeSubscription.findFirstOrThrow({ where: { store: { slug: 'padaria' } } })).freePeriodEndsAt).toEqual(given);
    });

    it('says so of a coupon switched off already, and refuses one nobody made', async () => {
      await run('create', '--code', 'TESTE-DUAS-VEZES');
      await run('disable', '--code', 'TESTE-DUAS-VEZES');
      const switchedOff = (await prisma.platformCoupon.findUniqueOrThrow({ where: { code: 'TESTE-DUAS-VEZES' } })).disabledAt;

      expect(await run('disable', '--code', 'TESTE-DUAS-VEZES')).toMatchObject({ exit: COMMAND_EXIT.done, out: expect.stringContaining('disabled already') });
      expect((await prisma.platformCoupon.findUniqueOrThrow({ where: { code: 'TESTE-DUAS-VEZES' } })).disabledAt).toEqual(switchedOff);
      expect(await run('disable', '--code', 'TESTE-NINGUEM')).toMatchObject({ exit: COMMAND_EXIT.refused, err: 'No coupon has the code TESTE-NINGUEM.' });
    });
  });

  describe('a coupon it made, used on a page', () => {
    it('gives the page its month, and is counted', async () => {
      await run('create', '--code', 'TESTE-USO', '--max-uses', '1');
      await openShop('padaria');

      expect((await redeem('teste-uso', 'padaria')).statusCode).toBe(200);
      expect((await run('list')).out).toMatch(/TESTE-USO +used up +no end +1 of 1/);
    });
  });

  it('says how it is used when asked for help, and when given nothing', async () => {
    expect(await run('help')).toMatchObject({ exit: COMMAND_EXIT.done, out: expect.stringContaining('node dist/scripts/platform-coupon.js create --code <CODE>') });
    expect((await run()).exit).toBe(COMMAND_EXIT.usage);
  });
});
