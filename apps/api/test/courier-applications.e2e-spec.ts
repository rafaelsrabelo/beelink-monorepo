// The limit is read when the controller module loads, so it has to be lowered before any import.
vi.hoisted(() => {
  process.env.COURIER_APPLICATION_RATE_LIMIT_MAX = '3';
  process.env.COURIER_APPLICATION_RATE_LIMIT_WINDOW = '1 minute';
});

// Node
import { readFileSync } from 'node:fs';
import { Writable } from 'node:stream';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import { Logger, PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';

// App
import { requestLogOptions } from '../src/app.module.js';
import { LEGAL_VERSION } from '../src/modules/auth/auth.constants.js';
import { CourierApplicationMailer } from '../src/modules/couriers/courier-application-mailer.js';
import { env } from '../src/shared/config/env.js';
import { MailService, addressOf } from '../src/shared/mail/mail.service.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, countMessages, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

// Types
import type { ApiErrorBody, CourierApplicationErrorCode, CourierApplicationPayload } from '@harness-monorepo/contracts';

/** A body the route takes, as a person types it. Every value is made up; the CPF is the textbook one. */
const typed = {
  name: 'Zuleica Tavares',
  document: '529.982.247-25',
  email: 'Zuleica.Tavares@Exemplo.test',
  whatsapp: '(85) 98765-4321',
  city: 'FORTALEZA_CE',
  vehicle: 'MOTORCYCLE',
  acceptedTerms: true,
} satisfies CourierApplicationPayload;

/** Somebody else altogether: another CPF, another e-mail, another number. */
const other = {
  ...typed,
  name: 'Raimundo Nonato Alves',
  document: '111.444.777-35',
  email: 'raimundo@exemplo.test',
  whatsapp: '(85) 91234-5678',
} satisfies CourierApplicationPayload;

/** A CPF that checks out, from its first nine digits: nobody's, made for the tests that need many. */
function cpfOf(nine: string): string {
  const digit = (digits: string) => {
    const sum = [...digits].reduce((total, each, at) => total + Number(each) * (digits.length + 1 - at), 0);
    return String(((sum * 10) % 11) % 10);
  };
  const first = digit(nine);

  return nine + first + digit(nine + first);
}

/** Every way the four values that say who that person is could show up in a line of the log. */
const PERSONAL = /Zuleica|Tavares|529\.982\.247|52998224725|98765-4321|987654321/i;

/** Where `typed` is written to, as the table keeps it. */
const EMAIL = 'zuleica.tavares@exemplo.test';

/**
 * The migration's own statement for whoever was on the list before the e-mail existed (BEELINK-326),
 * read from its file: what runs here is what a deploy runs.
 */
function backfillStatement(): string {
  const migration = readFileSync(new URL('../prisma/migrations/20261013145546_courier_application_notices/migration.sql', import.meta.url), 'utf8');
  const statement = /^INSERT INTO "courier_application_notices"[\s\S]*?;/m.exec(migration)?.[0];
  if (!statement) throw new Error('The migration no longer carries the statement that owes an e-mail to who was on the list');

  return statement;
}

describe('courier applications', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let mailer: CourierApplicationMailer;
  let address = 0;

  /** What pino wrote, a line each. The application's own options; only the destination is this. */
  const logged: string[] = [];

  beforeAll(async () => {
    const sink = new Writable({
      write(chunk: Buffer, _encoding, done) {
        logged.push(chunk.toString());
        done();
      },
    });

    app = await createTestApp((builder) =>
      builder.overrideProvider(PARAMS_PROVIDER_TOKEN).useValue({ pinoHttp: [{ ...requestLogOptions, level: 'info' }, sink] }),
    );
    // As main.ts does: what a service or the exception filter logs goes through pino too.
    app.useLogger(app.get(Logger));
    prisma = app.get(PrismaService);
    mailer = app.get(CourierApplicationMailer);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    logged.length = 0;
  });

  // An application kept asks for its e-mail and does not wait: a test that ended with one on its way
  // would have it land in the next test's inbox, or find its row truncated under it.
  afterEach(async () => {
    vi.restoreAllMocks();
    await settled();
  });

  /** Every e-mail owed either went or was given up: nothing is on its way. */
  function settled() {
    return vi.waitFor(async () => expect(await prisma.courierApplicationNotice.count({ where: { sentAt: null, attempts: { lt: 5 } } })).toBe(0), { timeout: 10_000, interval: 50 });
  }

  /** A fresh address per request unless one is named: the limiter's bucket lives in the app. */
  function send(body: object, from?: string) {
    address += 1;

    return app.inject({
      method: 'POST',
      url: '/api/courier-applications',
      headers: { 'x-forwarded-for': from ?? `203.0.113.${address}` },
      payload: body,
    });
  }

  const rows = () => prisma.courierApplication.findMany({ orderBy: { createdAt: 'asc' } });
  const notices = () => prisma.courierApplicationNotice.findMany({ orderBy: { createdAt: 'asc' }, include: { application: { select: { email: true } } } });

  it('keeps a valid application, normalised, with the terms in force on the server', async () => {
    const before = Date.now();

    const response = await send(typed);

    expect(response.statusCode).toBe(204);
    expect(response.payload).toBe('');

    const kept = await rows();
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({
      name: 'Zuleica Tavares',
      document: '52998224725',
      email: 'zuleica.tavares@exemplo.test',
      whatsapp: '5585987654321',
      city: 'FORTALEZA_CE',
      vehicle: 'MOTORCYCLE',
      termsVersion: LEGAL_VERSION,
    });
    expect(kept[0]!.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(kept[0]!.termsAcceptedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('refuses a CPF already on the list, however it is written, and leaves what was kept as it was', async () => {
    await send(typed);
    const [first] = await rows();

    const again = await send({
      ...other,
      // The same CPF, written another way, and nothing else of that person.
      document: '52998224725',
      vehicle: 'CAR',
    });

    expect(again.statusCode).toBe(409);
    expect(again.json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode: 'COURIER_DOCUMENT_TAKEN' });
    expect(await rows()).toEqual([first]);
  });

  it.each([
    ['e-mail, typed in another case', { email: 'ZULEICA.TAVARES@exemplo.test' }, 'COURIER_EMAIL_TAKEN'],
    ['WhatsApp, typed with its country code', { whatsapp: '+55 85 98765-4321' }, 'COURIER_WHATSAPP_TAKEN'],
  ] satisfies [string, object, CourierApplicationErrorCode][])('refuses another CPF that comes with the same %s', async (_what, same, errorCode) => {
    await send(typed);
    const [first] = await rows();

    const response = await send({ ...other, ...same });

    expect(response.statusCode).toBe(409);
    expect(response.json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode });
    expect(await rows()).toEqual([first]);
  });

  it('names the CPF when the three of them are on the list', async () => {
    await send(typed);

    expect((await send(typed)).json<ApiErrorBody>().errorCode).toBe('COURIER_DOCUMENT_TAKEN');
  });

  it('keeps one of ten sent at once with one CPF, and refuses the nine', async () => {
    const answers = await Promise.all(Array.from({ length: 10 }, () => send(typed)));

    expect(answers.map((response) => response.statusCode).sort()).toEqual([204, ...Array.from({ length: 9 }, () => 409)]);
    expect(await rows()).toHaveLength(1);
  });

  // No index holds an e-mail to one row: what does is that looking and writing are one step.
  it('keeps one of ten people sent at once with one e-mail, and one of ten with one WhatsApp', async () => {
    const crowd = (shared: object, from: number) =>
      Array.from({ length: 10 }, (_, at) =>
        send({ ...typed, document: cpfOf(String(100000000 + from + at)), email: `pessoa${from + at}@exemplo.test`, whatsapp: `(85) 9${String(10000000 + from + at)}`, ...shared }),
      );

    const byEmail = await Promise.all(crowd({ email: 'uma.so@exemplo.test' }, 0));
    const byWhatsapp = await Promise.all(crowd({ whatsapp: '(85) 99999-0000' }, 100));

    expect(byEmail.map((response) => response.statusCode).sort()).toEqual([204, ...Array.from({ length: 9 }, () => 409)]);
    expect(byWhatsapp.map((response) => response.statusCode).sort()).toEqual([204, ...Array.from({ length: 9 }, () => 409)]);
    expect(await rows()).toHaveLength(2);

    // And the address ten people sent at once is written to once (BEELINK-326).
    await settled();
    expect(await notices()).toHaveLength(2);
    expect(await countMessages('uma.so@exemplo.test')).toBe(1);
  });

  it('keeps two people apart', async () => {
    await send(typed);
    await send(other);

    expect((await rows()).map((row) => row.document)).toEqual(['52998224725', '11144477735']);
  });

  it('answers the trap like a save, keeps nothing and owes no e-mail', async () => {
    const response = await send({ ...typed, website: 'http://spam.test' });

    expect(response.statusCode).toBe(204);
    expect(response.payload).toBe('');
    expect(await rows()).toHaveLength(0);
    expect(await notices()).toHaveLength(0);
    expect(await mailer.flush()).toBe(0);
    expect(await countMessages(EMAIL)).toBe(0);
  });

  it.each([
    ['a name with no surname', { name: 'Zuleica' }, 'COURIER_NAME_INVALID'],
    ['a CPF whose check digits are wrong', { document: '529.982.247-26' }, 'COURIER_DOCUMENT_INVALID'],
    ['an address that is none', { email: 'zuleica@' }, 'COURIER_EMAIL_INVALID'],
    ['a landline', { whatsapp: '(85) 3222-1111' }, 'COURIER_WHATSAPP_INVALID'],
    ['a city that is not open', { city: 'SAO_PAULO_SP' }, 'COURIER_CITY_NOT_OPEN'],
    ['a vehicle nobody offers', { vehicle: 'TRUCK' }, 'COURIER_VEHICLE_INVALID'],
    ['the terms left unticked', { acceptedTerms: false }, 'COURIER_TERMS_REQUIRED'],
  ] satisfies [string, object, CourierApplicationErrorCode][])('refuses %s with its own code, and keeps nothing', async (_what, change, errorCode) => {
    const response = await send({ ...typed, ...change });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>()).toMatchObject({ statusCode: 400, errorCode });
    expect(await rows()).toHaveLength(0);
  });

  it('refuses a body that names the version of the terms, or when they were taken', async () => {
    for (const smuggled of [{ termsVersion: '1999-01-01' }, { termsAcceptedAt: '1999-01-01T00:00:00.000Z' }]) {
      const response = await send({ ...typed, ...smuggled });

      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BAD_REQUEST');
    }

    expect(await rows()).toHaveLength(0);
  });

  it('answers 429 past the limit of one address, in the envelope of everything else, and leaves another address alone', async () => {
    const one = '198.51.100.7';
    const allowed = [await send(typed, one), await send(typed, one), await send({ ...typed, name: 'Zuleica' }, one)];
    const blocked = await send(typed, one);

    // A refusal counts like a save, whichever refusal it is: the limit is on asking, not on being kept.
    expect(allowed.map((response) => response.statusCode)).toEqual([204, 409, 400]);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<ApiErrorBody>()).toMatchObject({ statusCode: 429, errorCode: 'RATE_LIMITED' });
    expect(blocked.headers['retry-after']).toBeDefined();

    expect((await send(other, '198.51.100.8')).statusCode).toBe(204);
  });

  describe('an application with no e-mail (BEELINK-328)', () => {
    const { email: _email, ...short } = typed;
    const { email: _otherEmail, ...shortOther } = other;

    it('is kept with no address, owes no e-mail, and none is sent', async () => {
      const response = await send(short);

      expect(response.statusCode).toBe(204);
      expect(response.payload).toBe('');

      const kept = await rows();
      expect(kept).toHaveLength(1);
      expect(kept[0]).toMatchObject({
        name: 'Zuleica Tavares',
        document: '52998224725',
        email: null,
        whatsapp: '5585987654321',
        city: 'FORTALEZA_CE',
        vehicle: 'MOTORCYCLE',
        termsVersion: LEGAL_VERSION,
      });
      expect(await notices()).toHaveLength(0);
      expect(await mailer.flush()).toBe(0);
    });

    // No address is not an address repeated: the list is not looked through for one.
    it('keeps two people who both have none, and one who has one after them', async () => {
      expect((await send(short)).statusCode).toBe(204);
      expect((await send(shortOther)).statusCode).toBe(204);
      expect((await send({ ...typed, name: 'Francisca Alves Lima', document: cpfOf('390533447'), whatsapp: '(85) 99999-0001' })).statusCode).toBe(204);

      expect((await rows()).map((row) => [row.document, row.email])).toEqual([
        ['52998224725', null],
        ['11144477735', null],
        [cpfOf('390533447'), EMAIL],
      ]);
      // Only the one with an address is owed an e-mail.
      expect((await notices()).map((notice) => notice.application.email)).toEqual([EMAIL]);
    });

    it('is still refused by a CPF or a WhatsApp already on the list, each with its own code, whoever has an address', async () => {
      await send(short);

      const sameCpf = await send({ ...shortOther, document: '52998224725' });
      const sameNumber = await send({ ...other, whatsapp: '+55 85 98765-4321' });

      expect(sameCpf.statusCode).toBe(409);
      expect(sameCpf.json<ApiErrorBody>()).toMatchObject({ errorCode: 'COURIER_DOCUMENT_TAKEN' });
      expect(sameNumber.statusCode).toBe(409);
      expect(sameNumber.json<ApiErrorBody>()).toMatchObject({ errorCode: 'COURIER_WHATSAPP_TAKEN' });
      expect(await rows()).toHaveLength(1);
    });

    it('takes a null for one left out, and refuses one that is there and empty', async () => {
      expect((await send({ ...short, email: null })).statusCode).toBe(204);

      const empty = await send({ ...shortOther, email: '' });

      expect(empty.statusCode).toBe(400);
      expect(empty.json<ApiErrorBody>()).toMatchObject({ statusCode: 400, errorCode: 'COURIER_EMAIL_INVALID' });
      expect((await rows()).map((row) => row.email)).toEqual([null]);
    });

    // The route writes no notice for one. Two written past it are each done without a send: asked for
    // the older notice of "no address", the list would name one for the other.
    it('has a notice written for it some other way done without anything sent', async () => {
      for (const nine of ['111444777', '390533447']) {
        await prisma.courierApplication.create({
          data: { name: 'Sem Endereço', document: cpfOf(nine), email: null, whatsapp: `55859${nine.slice(1)}`, city: 'FORTALEZA_CE', vehicle: 'BICYCLE', termsVersion: LEGAL_VERSION, termsAcceptedAt: new Date(), notice: { create: {} } },
          select: { id: true },
        });
      }
      const sent = vi.spyOn(app.get(MailService), 'sendCourierApplicationReceived');

      expect(await mailer.flush()).toBe(0);

      expect(sent).not.toHaveBeenCalled();
      expect((await notices()).map((notice) => [notice.sentAt !== null, notice.attempts])).toEqual([
        [true, 1],
        [true, 1],
      ]);
    });
  });

  describe('the e-mail saying it arrived (BEELINK-326)', () => {
    /** A row written past the route, as the list took them before a person could be on it only once. */
    const listed = (nine: string, name: string, email: string, createdAt: string) =>
      prisma.courierApplication.create({
        data: { name, document: cpfOf(nine), email, whatsapp: `55859${nine.slice(1)}`, city: 'FORTALEZA_CE', vehicle: 'MOTORCYCLE', termsVersion: LEGAL_VERSION, termsAcceptedAt: new Date(createdAt), createdAt: new Date(createdAt) },
        select: { id: true },
      });

    it("reaches the address of an application that was kept, from bee-link's own sender, saying what was asked and leading nowhere", async () => {
      expect((await send(typed)).statusCode).toBe(204);

      const mail = await waitForMessage(EMAIL);

      expect(mail.Subject).toBe('Recebemos o seu cadastro de entregador na Beelink');
      expect(mail.From.Address).toBe(addressOf(env.MAIL_FROM));
      expect(mail.Text.replace(/\r\n/g, '\n').trim()).toBe(
        'Olá, Zuleica.\n\nRecebemos o seu cadastro para fazer entregas com a Beelink em Fortaleza.\n\nEm breve você recebe, neste e-mail, as orientações para seguir com o cadastro. Por enquanto, não é preciso fazer mais nada.\n\nEquipe Beelink',
      );
      expect(mail.HTML).toContain('Olá, Zuleica.');
      expect(mail.HTML).toContain('Recebemos o seu cadastro para fazer entregas com a Beelink em Fortaleza.');
      // No button and no link, and of the name only the first.
      expect(mail.HTML).not.toMatch(/<a\b|href|https?:/i);
      expect(mail.Text).not.toMatch(/https?:|www\./i);
      expect(`${mail.Text}${mail.HTML}`).not.toMatch(/Tavares|529|52998224725|98765/);
    });

    it('is owed by the application itself, marked sent once it went, and not sent again by another sweep', async () => {
      await send(typed);
      const [kept] = await rows();

      await settled();

      const [owed, ...others] = await notices();
      expect(others).toHaveLength(0);
      expect(owed).toMatchObject({ applicationId: kept!.id, attempts: 1 });
      expect(owed!.sentAt).not.toBeNull();

      expect(await mailer.flush()).toBe(0);
      expect(await mailer.flush()).toBe(0);
      expect(await countMessages(EMAIL)).toBe(1);
    });

    it('is neither owed nor sent for an application refused as already on the list, by any of the three', async () => {
      await send(typed);
      await settled();
      await clearInbox();

      const refused = [await send(typed), await send({ ...other, email: typed.email }), await send({ ...other, whatsapp: typed.whatsapp })];

      expect(refused.map((response) => response.statusCode)).toEqual([409, 409, 409]);
      expect(await notices()).toHaveLength(1);
      expect(await mailer.flush()).toBe(0);
      expect(await countMessages(EMAIL)).toBe(0);
      expect(await countMessages(other.email)).toBe(0);
    });

    it('is not owed for an application that was refused for what it carries', async () => {
      expect((await send({ ...typed, document: '529.982.247-26' })).statusCode).toBe(400);

      expect(await notices()).toHaveLength(0);
      expect(await mailer.flush()).toBe(0);
      expect(await countMessages(EMAIL)).toBe(0);
    });

    it('goes to each of two people, once each', async () => {
      await send(typed);
      await send(other);
      await settled();

      expect(await countMessages(EMAIL)).toBe(1);
      expect(await countMessages(other.email)).toBe(1);
      expect((await waitForMessage(other.email)).Text).toContain('Olá, Raimundo.');
    });

    it('is not waited for by the answer, and changes nothing of it when it does not go — it is owed still, and goes on a later sweep', async () => {
      let answer!: (went: boolean) => void;
      const sending = vi.spyOn(app.get(MailService), 'sendCourierApplicationReceived').mockImplementation(() => new Promise<boolean>((resolve) => (answer = resolve)));

      const response = await send(typed);

      // Answered with the provider still holding the e-mail.
      expect(response.statusCode).toBe(204);
      expect(response.payload).toBe('');
      await vi.waitFor(() => expect(sending).toHaveBeenCalledTimes(1));
      expect(await rows()).toHaveLength(1);

      answer(false);

      // Not sent: tried once, due again in a minute, and the application is where it was.
      await vi.waitFor(async () => {
        const [owed] = await notices();
        expect(owed).toMatchObject({ attempts: 1, sentAt: null });
        expect(owed!.nextAttemptAt.getTime()).toBeLessThan(Date.now() + 90_000);
      });
      expect((await notices())[0]!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 30_000);
      expect(await rows()).toHaveLength(1);
      expect(await countMessages(EMAIL)).toBe(0);

      // The minute, passed.
      sending.mockRestore();
      await prisma.courierApplicationNotice.updateMany({ data: { nextAttemptAt: new Date() } });

      expect(await mailer.flush()).toBe(1);
      expect((await notices())[0]).toMatchObject({ attempts: 2 });
      expect((await notices())[0]!.sentAt).not.toBeNull();
      expect(await countMessages(EMAIL)).toBe(1);
    });

    describe('one e-mail an address, whatever wrote what is owed', () => {
      // Neither the route nor the migration writes two for one address; a hand, or a path not there yet, could.
      it('sends only the oldest of two owed to one address, with two sweeps at once, and is done with the other', async () => {
        const older = await listed('200000001', 'Antiga Primeira', 'repetida@exemplo.test', '2026-10-10T10:00:00.000Z');
        const newer = await listed('200000002', 'Nova Segunda', 'repetida@exemplo.test', '2026-10-11T09:00:00.000Z');
        // The newer application's is written first: what decides is which is owed for longer, not which row is older.
        await prisma.courierApplicationNotice.create({ data: { applicationId: newer.id, createdAt: new Date('2026-10-12T08:00:00.000Z') } });
        await prisma.courierApplicationNotice.create({ data: { applicationId: older.id, createdAt: new Date('2026-10-12T09:00:00.000Z') } });

        const sent = await Promise.all([mailer.flush(), mailer.flush()]);

        expect(sent.reduce((sum, count) => sum + count, 0)).toBe(1);
        expect(await countMessages('repetida@exemplo.test')).toBe(1);
        expect((await waitForMessage('repetida@exemplo.test')).Text).toContain('Olá, Nova.');
        expect(await prisma.courierApplicationNotice.count({ where: { sentAt: null } })).toBe(0);
        expect(await mailer.flush()).toBe(0);
        expect(await countMessages('repetida@exemplo.test')).toBe(1);
      });
    });

    describe('whoever was on the list before it existed', () => {
      it("is owed it by the migration's own statement — once an address, by the oldest application of each — and then sent it once", async () => {
        const first = await listed('300000001', 'Antiga Primeira', 'repetida@exemplo.test', '2026-10-10T10:00:00.000Z');
        await listed('300000002', 'Nova Segunda', 'repetida@exemplo.test', '2026-10-11T09:00:00.000Z');
        await listed('300000003', 'Novíssima Terceira', 'repetida@exemplo.test', '2026-10-12T08:00:00.000Z');
        const alone = await listed('300000004', 'Sozinha Única', 'sozinha@exemplo.test', '2026-10-12T11:00:00.000Z');
        // Two of one address at one instant: the id decides, the same way every time.
        const tied = [await listed('300000005', 'Empate Um', 'empate@exemplo.test', '2026-10-12T12:00:00.000Z'), await listed('300000006', 'Empate Dois', 'empate@exemplo.test', '2026-10-12T12:00:00.000Z')];
        const lower = tied.map(({ id }) => id).sort()[0]!;
        expect(await notices()).toHaveLength(0);

        await prisma.$executeRawUnsafe(backfillStatement());

        const owed = await notices();
        expect(owed.map((notice) => notice.applicationId).sort()).toEqual([first.id, alone.id, lower].sort());
        expect(owed.map((notice) => notice.application.email).sort()).toEqual(['empate@exemplo.test', 'repetida@exemplo.test', 'sozinha@exemplo.test']);
        for (const notice of owed) expect(notice).toMatchObject({ attempts: 0, sentAt: null });

        expect(await mailer.flush()).toBe(3);

        expect(await countMessages('repetida@exemplo.test')).toBe(1);
        expect(await countMessages('sozinha@exemplo.test')).toBe(1);
        expect(await countMessages('empate@exemplo.test')).toBe(1);
        expect((await waitForMessage('repetida@exemplo.test')).Text).toContain('Olá, Antiga.');
        expect(await mailer.flush()).toBe(0);
      });

      it('is owed nothing by a list that is empty', async () => {
        await prisma.$executeRawUnsafe(backfillStatement());

        expect(await notices()).toHaveLength(0);
      });
    });

    it('is taken out with its application', async () => {
      await send(typed);
      await settled();

      await prisma.courierApplication.deleteMany({ where: { document: '52998224725' } });

      expect(await notices()).toHaveLength(0);
    });
  });

  describe('the table', () => {
    const insert = (document: string, whatsapp: string) => prisma.$executeRaw`
      INSERT INTO "courier_applications" ("id", "name", "document", "email", "whatsapp", "city", "vehicle", "termsVersion", "termsAcceptedAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Zuleica Tavares', ${document}, 'zuleica.tavares@exemplo.test', ${whatsapp}, 'FORTALEZA_CE', 'CAR', ${LEGAL_VERSION}, now(), now())`;

    it('refuses, by itself, a document that is not eleven digits and a WhatsApp that is not digits', async () => {
      await expect(insert('529.982.247', '5585987654321')).rejects.toThrow(/courier_applications_document_check/);
      await expect(insert('5299822472', '5585987654321')).rejects.toThrow(/courier_applications_document_check/);
      await expect(insert('52998224725', '(85) 98765-4321')).rejects.toThrow(/courier_applications_whatsapp_check/);
    });

    it('refuses, by itself, a second row of one CPF', async () => {
      await insert('52998224725', '5585987654321');

      await expect(insert('52998224725', '5585987654321')).rejects.toThrow(/courier_applications_document_key|Unique constraint/);
    });
  });

  describe('what the log keeps', () => {
    const lines = () => logged.flatMap((chunk) => chunk.split('\n')).filter(Boolean).map((line) => JSON.parse(line) as LogLine);

    type LogLine = { level: number; msg?: string; reason?: string; noticeId?: string; req?: { url?: string }; res?: { statusCode?: number } };

    const requestLine = (statusCode: number) =>
      lines().find((line) => line.req?.url === '/api/courier-applications' && line.res?.statusCode === statusCode);

    it('writes a line for an application that was kept, with nothing of who sent it — its e-mail gone too', async () => {
      expect((await send(typed)).statusCode).toBe(204);
      await waitForMessage(EMAIL);
      await settled();

      expect(requestLine(204)).toBeDefined();
      expect(logged.join('')).not.toMatch(PERSONAL);
      expect(logged.join('')).not.toMatch(/exemplo\.test/i);
    });

    // A send that failed is the provider's own error, logged by `MailService` as every e-mail's is;
    // stood in for here, so what is read is what this outbox writes.
    it('names an e-mail given up on the fifth try by the id of what was owed, with nothing of who it was for', async () => {
      vi.spyOn(app.get(MailService), 'sendCourierApplicationReceived').mockResolvedValue(false);
      await send(typed);
      await vi.waitFor(async () => expect((await notices())[0]!.nextAttemptAt.getTime()).toBeLessThan(Date.now() + 90_000));
      const [owed] = await notices();
      // Four tries behind it, and the last wait over.
      await prisma.courierApplicationNotice.update({ where: { id: owed!.id }, data: { attempts: 4, nextAttemptAt: new Date() } });

      expect(await mailer.flush()).toBe(0);

      const gaveUp = lines().filter((line) => line.msg === 'Gave up on a courier application notice');
      expect(gaveUp).toHaveLength(1);
      expect(gaveUp[0]).toMatchObject({ level: 40, noticeId: owed!.id });
      expect((await notices())[0]).toMatchObject({ attempts: 5, sentAt: null });
      expect(logged.join('')).not.toMatch(PERSONAL);
      expect(logged.join('')).not.toMatch(/exemplo\.test/i);
      // Given up is given up: no sweep takes it again.
      expect(await mailer.flush()).toBe(0);
      expect(await countMessages(EMAIL)).toBe(0);
    });

    it('writes a line for one refused as already on the list, with nothing of who sent it or of who was there', async () => {
      await send(typed);
      logged.length = 0;

      expect((await send(typed)).statusCode).toBe(409);

      expect(requestLine(409)).toBeDefined();
      expect(logged.join('')).not.toMatch(PERSONAL);
    });

    it('writes a line for one that was refused, with nothing of who sent it', async () => {
      // Every personal field wrong at once, each still recognisably that person's.
      const response = await send({
        ...typed,
        name: 'Zuleica',
        document: '529.982.247-26',
        email: 'Zuleica.Tavares@',
        whatsapp: '(85) 8765-4321',
      });

      expect(response.statusCode).toBe(400);
      expect(requestLine(400)).toBeDefined();
      expect(logged.join('')).not.toMatch(/Zuleica|Tavares|529\.982\.247|8765-4321|87654321/i);
    });

    // Postgres writes the row it refused into the error's detail, and the filter logs a 500 whole.
    // The table is made to refuse one name for the length of this test, so the refusal is real.
    it('writes that the database refused, by the failure\'s code, with nothing of the row it refused', async () => {
      await prisma.$executeRawUnsafe('ALTER TABLE "courier_applications" DROP CONSTRAINT IF EXISTS "courier_applications_e2e_refusal"');
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "courier_applications" ADD CONSTRAINT "courier_applications_e2e_refusal" CHECK ("name" <> 'Zuleica Tavares')`,
      );

      try {
        const response = await send(typed);

        expect(response.statusCode).toBe(500);
        expect(response.json<ApiErrorBody>()).toEqual({ statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'Internal server error' });
      } finally {
        await prisma.$executeRawUnsafe('ALTER TABLE "courier_applications" DROP CONSTRAINT "courier_applications_e2e_refusal"');
      }

      const refusal = lines().find((line) => line.msg === 'A courier application could not be kept');
      expect(refusal).toMatchObject({ level: 50, reason: expect.stringMatching(/^PrismaClientKnownRequestError P\d{4} 23514$/) });
      expect(requestLine(500)).toBeDefined();
      expect(logged.join('')).not.toMatch(PERSONAL);
      expect(await rows()).toHaveLength(0);
      // Neither the application nor what it would owe.
      expect(await notices()).toHaveLength(0);
      expect(await countMessages(EMAIL)).toBe(0);
    });
  });
});
