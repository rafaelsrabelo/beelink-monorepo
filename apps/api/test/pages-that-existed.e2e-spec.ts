// Node
import { readFileSync } from 'node:fs';

// Libs
import pg from 'pg';

// App
import { closeOfBrasiliaDay, freeMonthEndOf, trialEndOf } from '../src/modules/billing/billing-dates.js';
import { PAGES_EXISTED_ON } from '../src/modules/billing/billing.constants.js';
import type { SubscriptionStatus } from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { resetDatabase } from './support/reset-database.js';
import { TEST_DATABASE_URL } from './support/test-database.js';

const MIGRATION = readFileSync(new URL('../prisma/migrations/20261015170000_pages_that_existed/migration.sql', import.meta.url), 'utf8');

/** The first instant of 14/10/2026 in Brasília: a page created before it existed on 13/10. */
const EXISTED_BEFORE = closeOfBrasiliaDay(PAGES_EXISTED_ON);
/** The end of the month those pages were given: 13/11/2026 over in Brasília. */
const MONTH_END = freeMonthEndOf(PAGES_EXISTED_ON);
const MS = 1;

/**
 * The migration that gave every page of 13/10/2026 its free month (BEELINK-297), run here by hand on
 * planted pages — the suite's database had it applied, empty, by the global setup — and run twice, as
 * a script reaches Postgres: in one go, which Postgres runs as one transaction.
 */
describe('the pages that existed on 13/10/2026 (BEELINK-297)', () => {
  const prisma = new PrismaService();
  let owner: string;
  let pages = 0;

  async function migrate(): Promise<void> {
    const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    try {
      await client.query(MIGRATION);
    } finally {
      await client.end();
    }
  }

  /** A page created at `createdAt`, with no subscription — as one made before subscriptions existed. */
  async function pageFrom(createdAt: Date): Promise<string> {
    pages += 1;
    const store = await prisma.store.create({ data: { ownerId: owner, slug: `teste-s15-${pages}`, name: `Teste S15 ${pages}`, createdAt } });
    return store.id;
  }

  /** A page created at `createdAt` with the row `openTrial` writes, then set as `data` says. */
  async function pageWithRow(createdAt: Date, data: { status?: SubscriptionStatus; freePeriodEndsAt?: Date; currentPeriodEndsAt?: Date; asaasSubscriptionId?: string } = {}): Promise<string> {
    const storeId = await pageFrom(createdAt);
    await prisma.storeSubscription.create({ data: { storeId, status: 'TRIALING', trialStartedAt: createdAt, trialEndsAt: trialEndOf(createdAt), ...data } });
    return storeId;
  }

  const rowOf = (storeId: string) => prisma.storeSubscription.findUniqueOrThrow({ where: { storeId } });
  const everything = () => prisma.storeSubscription.findMany({ orderBy: { storeId: 'asc' } });

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    owner = (await prisma.user.create({ data: { name: 'Teste S15 Dona', email: `teste-s15-${Date.now()}@exemplo.test` } })).id;
  });

  it('counts 13/10 to its last instant in Brasília, and gives the month to the end of 13/11 there', () => {
    expect(EXISTED_BEFORE).toEqual(new Date('2026-10-14T03:00:00.000Z'));
    expect(MONTH_END).toEqual(new Date('2026-11-14T03:00:00.000Z'));
  });

  it('gives a page from before subscriptions the row a new page is born with, and the month only when it existed on 13/10', async () => {
    const instants = [new Date('2026-09-20T13:00:00.000Z'), new Date(EXISTED_BEFORE.getTime() - MS), EXISTED_BEFORE, new Date('2026-10-14T18:00:00.000Z')];
    const ids = [];
    for (const createdAt of instants) ids.push(await pageFrom(createdAt));

    await migrate();

    for (const [index, createdAt] of instants.entries()) {
      expect(await rowOf(ids[index]!)).toMatchObject({
        status: 'TRIALING',
        trialStartedAt: createdAt,
        trialEndsAt: trialEndOf(createdAt),
        freePeriodEndsAt: createdAt < EXISTED_BEFORE ? MONTH_END : null,
        planId: null,
        asaasSubscriptionId: null,
        currentPeriodEndsAt: null,
      });
    }
  });

  it('counts the trial as trialEndOf does, across the turn of a day, a month, a year and a leap February', async () => {
    const instants = [
      '2026-10-14T02:59:59.999Z',
      '2026-10-14T03:00:00.000Z',
      '2026-10-31T23:30:00.000Z',
      '2026-12-31T02:59:59.999Z',
      '2026-12-31T03:00:00.000Z',
      '2027-02-22T12:00:00.000Z',
      '2028-02-22T12:00:00.000Z',
      '2028-02-29T02:00:00.000Z',
    ].map((at) => new Date(at));
    const ids = [];
    for (const createdAt of instants) ids.push(await pageFrom(createdAt));

    await migrate();

    for (const [index, createdAt] of instants.entries()) expect((await rowOf(ids[index]!)).trialEndsAt).toEqual(trialEndOf(createdAt));
  });

  it('gives the month to a page of 13/10 that never paid — in its trial, past it, or with an invoice open', async () => {
    const trialing = await pageWithRow(new Date('2026-10-13T18:00:00.000Z'));
    const expired = await pageWithRow(new Date('2026-10-13T19:00:00.000Z'), { status: 'TRIAL_EXPIRED' });
    const withInvoice = await pageWithRow(new Date('2026-10-13T20:00:00.000Z'), { asaasSubscriptionId: 'sub_teste_s15_aberta' });

    await migrate();

    for (const storeId of [trialing, expired, withInvoice]) expect((await rowOf(storeId)).freePeriodEndsAt).toEqual(MONTH_END);
    expect(await rowOf(expired)).toMatchObject({ status: 'TRIAL_EXPIRED' });
    expect(await rowOf(withInvoice)).toMatchObject({ status: 'TRIALING', asaasSubscriptionId: 'sub_teste_s15_aberta' });
  });

  it('never shortens a later free month, and lengthens an earlier one to the end of 13/11', async () => {
    const later = new Date('2026-11-22T03:00:00.000Z');
    const coupon = await pageWithRow(new Date('2026-10-13T18:00:00.000Z'), { freePeriodEndsAt: later });
    const earlier = await pageWithRow(new Date('2026-10-13T19:00:00.000Z'), { freePeriodEndsAt: new Date('2026-11-01T03:00:00.000Z') });
    const before = await rowOf(coupon);

    await migrate();

    expect(await rowOf(coupon)).toEqual(before);
    expect((await rowOf(earlier)).freePeriodEndsAt).toEqual(MONTH_END);
  });

  it('leaves an exempt page and every page that paid exactly as they were', async () => {
    const createdAt = new Date('2026-10-13T18:00:00.000Z');
    const period = new Date('2026-11-13T03:00:00.000Z');
    const left = [
      await pageWithRow(createdAt, { status: 'EXEMPT' }),
      await pageWithRow(createdAt, { status: 'ACTIVE', currentPeriodEndsAt: period, asaasSubscriptionId: 'sub_teste_s15_ativa' }),
      await pageWithRow(createdAt, { status: 'PAST_DUE', currentPeriodEndsAt: period, asaasSubscriptionId: 'sub_teste_s15_atraso' }),
      await pageWithRow(createdAt, { status: 'SUSPENDED', currentPeriodEndsAt: period, asaasSubscriptionId: 'sub_teste_s15_suspensa' }),
      await pageWithRow(createdAt, { status: 'CANCELED', currentPeriodEndsAt: period, asaasSubscriptionId: 'sub_teste_s15_cancelada' }),
    ];
    const before = await everything();

    await migrate();

    expect(await everything()).toEqual(before);
    for (const storeId of left) expect((await rowOf(storeId)).freePeriodEndsAt).toBeNull();
  });

  it('gives nothing to a page created from 14/10 on, whose row it already had', async () => {
    await pageWithRow(EXISTED_BEFORE);
    await pageWithRow(new Date('2026-10-20T15:00:00.000Z'));
    const before = await everything();

    await migrate();

    expect(await everything()).toEqual(before);
  });

  it('changes nothing the second time, and writes no use of a coupon', async () => {
    await pageFrom(new Date('2026-09-20T13:00:00.000Z'));
    await pageFrom(new Date('2026-10-20T13:00:00.000Z'));
    await pageWithRow(new Date('2026-10-13T18:00:00.000Z'));
    await pageWithRow(new Date('2026-10-13T19:00:00.000Z'), { status: 'EXEMPT' });

    await migrate();
    const once = await everything();
    await migrate();

    expect(once).toHaveLength(4);
    expect(await everything()).toEqual(once);
    expect(await prisma.platformCouponRedemption.count()).toBe(0);
  });
});
