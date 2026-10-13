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
  });

  it('keeps two people apart', async () => {
    await send(typed);
    await send(other);

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

    // A refusal counts like a save, whichever refusal it is: the limit is on asking, not on being kept.
    expect(allowed.map((response) => response.statusCode)).toEqual([204, 409, 400]);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<ApiErrorBody>()).toMatchObject({ statusCode: 429, errorCode: 'RATE_LIMITED' });
    expect(blocked.headers['retry-after']).toBeDefined();

    expect((await send(other, '198.51.100.8')).statusCode).toBe(204);
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
    });
  });
});
