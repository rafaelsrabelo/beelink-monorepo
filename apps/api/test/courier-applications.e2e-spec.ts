// The limit is read when the controller module loads, so it has to be lowered before any import.
vi.hoisted(() => {
  process.env.COURIER_APPLICATION_RATE_LIMIT_MAX = '3';
  process.env.COURIER_APPLICATION_RATE_LIMIT_WINDOW = '1 minute';
});

// Node
import { Writable } from 'node:stream';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import { Logger, PARAMS_PROVIDER_TOKEN } from 'nestjs-pino';

// App
import { requestLogOptions } from '../src/app.module.js';
import { LEGAL_VERSION } from '../src/modules/auth/auth.constants.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createTestApp } from './support/create-test-app.js';
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

/** Every way the four values that say who that person is could show up in a line of the log. */
const PERSONAL = /Zuleica|Tavares|529\.982\.247|52998224725|98765-4321|987654321/i;

describe('courier applications', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    logged.length = 0;
  });

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

  it('takes the same CPF again without a second row, replacing what was kept and when the terms were taken', async () => {
    await send(typed);
    // The first application, made to be an old one: another day, under the terms that came before.
    await prisma.$executeRaw`
      UPDATE "courier_applications"
      SET "createdAt" = '2026-09-30 12:00:00', "updatedAt" = '2026-09-30 12:00:00', "termsAcceptedAt" = '2026-09-30 12:00:00', "termsVersion" = '2026-09-30'`;
    const [first] = await rows();
    const before = Date.now();

    const again = await send({
      ...typed,
      // The same CPF, written another way.
      document: '52998224725',
      name: 'Zuleica T. Brandão',
      email: 'zuleica.brandao@exemplo.test',
      whatsapp: '85 91234-5678',
      vehicle: 'CAR',
    });

    expect(again.statusCode).toBe(204);
    expect(again.payload).toBe('');

    const kept = await rows();
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({
      id: first!.id,
      createdAt: first!.createdAt,
      name: 'Zuleica T. Brandão',
      document: '52998224725',
      email: 'zuleica.brandao@exemplo.test',
      whatsapp: '5585912345678',
      vehicle: 'CAR',
      termsVersion: LEGAL_VERSION,
    });
    expect(first!.createdAt.toISOString()).toBe('2026-09-30T12:00:00.000Z');
    expect(kept[0]!.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(kept[0]!.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('keeps one row of ten sent at once with one CPF', async () => {
    const answers = await Promise.all(Array.from({ length: 10 }, () => send(typed)));

    expect(answers.map((response) => response.statusCode)).toEqual(Array.from({ length: 10 }, () => 204));
    expect(await rows()).toHaveLength(1);
  });

  it('keeps two people apart', async () => {
    await send(typed);
    await send({ ...typed, document: '111.444.777-35', name: 'Raimundo Nonato Alves', email: 'raimundo@exemplo.test' });

    expect((await rows()).map((row) => row.document)).toEqual(['52998224725', '11144477735']);
  });

  it('answers the trap like a save and keeps nothing', async () => {
    const response = await send({ ...typed, website: 'http://spam.test' });

    expect(response.statusCode).toBe(204);
    expect(response.payload).toBe('');
    expect(await rows()).toHaveLength(0);
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

    // A refusal counts like a save: the limit is on asking, not on being kept.
    expect(allowed.map((response) => response.statusCode)).toEqual([204, 204, 400]);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<ApiErrorBody>()).toMatchObject({ statusCode: 429, errorCode: 'RATE_LIMITED' });
    expect(blocked.headers['retry-after']).toBeDefined();

    expect((await send(typed, '198.51.100.8')).statusCode).toBe(204);
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

    type LogLine = { level: number; msg?: string; reason?: string; req?: { url?: string }; res?: { statusCode?: number } };

    const requestLine = (statusCode: number) =>
      lines().find((line) => line.req?.url === '/api/courier-applications' && line.res?.statusCode === statusCode);

    it('writes a line for an application that was kept, with nothing of who sent it', async () => {
      expect((await send(typed)).statusCode).toBe(204);

      expect(requestLine(204)).toBeDefined();
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
    });
  });
});
