// Nest
import { Logger } from '@nestjs/common';

// App
import { LEGAL_VERSION } from '../auth/auth.constants.js';
import { CourierApplicationsService } from './courier-applications.service.js';

// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { CourierApplicationDto } from './dto/courier-application.dto.js';

/** An application as the DTO hands it over: normalised and checked. Every value is made up. */
const application = {
  name: 'Zuleica Tavares',
  document: '52998224725',
  email: 'zuleica.tavares@exemplo.test',
  whatsapp: '5585987654321',
  city: 'FORTALEZA_CE',
  vehicle: 'MOTORCYCLE',
  acceptedTerms: true,
} satisfies CourierApplicationDto;

const NOW = new Date('2026-10-12T15:00:00.000Z');

type Listed = { document: string; email: string; whatsapp: string };

/** The service over a list that holds `listed`, with the transaction's own client stood in for. */
function build({ listed = [] as Listed[], create = vi.fn().mockResolvedValue({ id: '0199e000-0000-7000-8000-000000000001' }) } = {}) {
  const lock = vi.fn().mockResolvedValue(1);
  const findMany = vi.fn().mockResolvedValue(listed);
  const tx = { $executeRaw: lock, courierApplication: { findMany, create } };
  const transaction = vi.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx));
  const prisma = { $transaction: transaction } as unknown as PrismaService;

  return { service: new CourierApplicationsService(prisma), transaction, lock, findMany, create };
}

/** What a refusal answers, as the exception filter reads it. */
async function refusalOf(sending: Promise<void>) {
  const failure = (await sending.catch((error: unknown) => error)) as { getStatus(): number; getResponse(): unknown };

  return { status: failure.getStatus(), body: failure.getResponse() };
}

describe('CourierApplicationsService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps an application nobody on the list shares a CPF, an e-mail or a WhatsApp with', async () => {
    const { service, findMany, create } = build();

    await expect(service.receive(application)).resolves.toBeUndefined();

    expect(findMany.mock.calls[0]![0]).toMatchObject({
      where: { OR: [{ document: '52998224725' }, { email: 'zuleica.tavares@exemplo.test' }, { whatsapp: '5585987654321' }] },
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]![0]).toMatchObject({
      data: {
        document: '52998224725',
        name: 'Zuleica Tavares',
        email: 'zuleica.tavares@exemplo.test',
        whatsapp: '5585987654321',
        city: 'FORTALEZA_CE',
        vehicle: 'MOTORCYCLE',
      },
    });
  });

  // Two sends of one e-mail arriving together would each find the list without it: looking and writing are one step.
  it('takes the list for itself before it looks, and looks before it writes', async () => {
    const { service, transaction, lock, findMany, create } = build();

    await service.receive(application);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect((lock.mock.calls[0]![0] as readonly string[]).join('')).toMatch(/pg_advisory_xact_lock\(hashtextextended\('courier_applications', 0\)\)/);
    expect(lock.mock.invocationCallOrder[0]).toBeLessThan(findMany.mock.invocationCallOrder[0]!);
    expect(findMany.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]!);
  });

  it('records the terms in force on the server, taken at the moment it arrived', async () => {
    const { service, create } = build();

    await service.receive(application);

    expect((create.mock.calls[0]![0] as { data: object }).data).toMatchObject({ termsVersion: LEGAL_VERSION, termsAcceptedAt: NOW });
  });

  // The DTO has no such field and the pipe refuses one; this is the service not trusting that.
  it('reads neither the version nor the moment from what it was handed', async () => {
    const { service, create } = build();
    const smuggled = { ...application, termsVersion: '1999-01-01', termsAcceptedAt: new Date(0), createdAt: new Date(0) };

    await service.receive(smuggled);

    const written = (create.mock.calls[0]![0] as { data: object }).data;
    expect(written).toMatchObject({ termsVersion: LEGAL_VERSION, termsAcceptedAt: NOW });
    expect(written).not.toHaveProperty('createdAt');
  });

  describe('a person already on the list (BEELINK-325)', () => {
    const someoneElse = { document: '11144477735', email: 'raimundo@exemplo.test', whatsapp: '5585912345678' };

    it.each([
      ['the CPF', { document: application.document }, 'COURIER_DOCUMENT_TAKEN'],
      ['the e-mail', { email: application.email }, 'COURIER_EMAIL_TAKEN'],
      ['the WhatsApp', { whatsapp: application.whatsapp }, 'COURIER_WHATSAPP_TAKEN'],
    ])('is refused by %s alone, with its own code, and nothing is written', async (_what, shared, errorCode) => {
      const { service, create } = build({ listed: [{ ...someoneElse, ...shared }] });
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      const { status, body } = await refusalOf(service.receive(application));

      expect(status).toBe(409);
      expect(body).toMatchObject({ errorCode });
      expect(create).not.toHaveBeenCalled();
      // A refusal is no failure: nothing is logged as one.
      expect(logged).not.toHaveBeenCalled();
    });

    it('names the CPF before the e-mail, and the e-mail before the WhatsApp, whoever on the list each belongs to', async () => {
      const three = [
        { ...someoneElse, whatsapp: application.whatsapp },
        { ...someoneElse, document: '39053344705', email: application.email },
        { ...someoneElse, document: application.document, email: 'outra@exemplo.test' },
      ];

      expect((await refusalOf(build({ listed: three }).service.receive(application))).body).toMatchObject({ errorCode: 'COURIER_DOCUMENT_TAKEN' });
      expect((await refusalOf(build({ listed: three.slice(0, 2) }).service.receive(application))).body).toMatchObject({ errorCode: 'COURIER_EMAIL_TAKEN' });
      expect((await refusalOf(build({ listed: three.slice(0, 1) }).service.receive(application))).body).toMatchObject({ errorCode: 'COURIER_WHATSAPP_TAKEN' });
    });

    it('says which of the three, and nothing of whose', async () => {
      const { service } = build({ listed: [{ ...someoneElse, document: application.document }] });

      const { body } = await refusalOf(service.receive(application));

      expect(JSON.stringify(body)).not.toMatch(/52998224725|11144477735|exemplo\.test|5585/);
    });
  });

  /** The trap: a field no person sees was filled in. Success is answered; nothing happens. */
  it('answers a body that fell into the trap as if saved, and neither looks nor saves', async () => {
    const { service, transaction } = build();

    await expect(service.receive({ ...application, website: 'http://spam.test' })).resolves.toBeUndefined();

    expect(transaction).not.toHaveBeenCalled();
  });

  // An untouched hidden input travels as an empty string: that is a person, not a robot.
  it('keeps an application whose trap is there and empty', async () => {
    const { service, create } = build();

    await service.receive({ ...application, website: '' });

    expect(create).toHaveBeenCalledTimes(1);
  });

  describe('when the database refuses', () => {
    /** As Prisma hands Postgres's refusal over: the row it refused is in the message and in the detail. */
    const refusal = Object.assign(
      new Error('Failing row contains (Zuleica Tavares, 52998224725, zuleica.tavares@exemplo.test, 5585987654321).'),
      {
        name: 'PrismaClientKnownRequestError',
        code: 'P2039',
        meta: {
          driverAdapterError: {
            cause: { originalCode: '23514', detail: 'Failing row contains (Zuleica Tavares, 52998224725).' },
          },
        },
      },
    );

    it('answers a 500 that carries nothing of the row', async () => {
      const { service } = build({ create: vi.fn().mockRejectedValue(refusal) });
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      const failure = (await service.receive(application).catch((error: unknown) => error)) as Error & {
        getStatus(): number;
        getResponse(): unknown;
        cause?: unknown;
      };

      expect(failure.getStatus()).toBe(500);
      expect(failure.getResponse()).toEqual({ errorCode: 'INTERNAL_ERROR', message: 'Internal server error' });
      // The filter logs the exception whole: neither it nor a cause may be the database's own error.
      expect(failure).not.toBe(refusal);
      expect(failure.cause).toBeUndefined();
      expect(JSON.stringify([failure.message, failure.stack])).not.toMatch(/Zuleica|52998224725|exemplo\.test|5585987654321/);
    });

    it('logs which kind of failure it was, and nothing it was about', async () => {
      const { service } = build({ create: vi.fn().mockRejectedValue(refusal) });
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await service.receive(application).catch(() => undefined);

      expect(logged).toHaveBeenCalledTimes(1);
      expect(logged.mock.calls[0]).toEqual([
        { reason: 'PrismaClientKnownRequestError P2039 23514' },
        'A courier application could not be kept',
      ]);
    });

    // A code is a word. Whatever else sits where a code is expected may be the row, and is left out.
    it('takes nothing for a code that is not shaped like one', async () => {
      const odd = Object.assign(new Error('refused'), {
        name: 'Zuleica Tavares 52998224725',
        code: 'zuleica.tavares@exemplo.test',
        meta: { driverAdapterError: { cause: { originalCode: 'Failing row contains (52998224725)' } } },
      });
      const { service } = build({ create: vi.fn().mockRejectedValue(odd) });
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await service.receive(application).catch(() => undefined);

      expect(logged.mock.calls[0]![0]).toEqual({ reason: 'UNKNOWN' });
    });

    it('names what was thrown and is no error as unknown', async () => {
      const { service } = build({ create: vi.fn().mockRejectedValue('52998224725') });
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await service.receive(application).catch(() => undefined);

      expect(logged.mock.calls[0]![0]).toEqual({ reason: 'UNKNOWN' });
    });

    it('names a failure that is no Prisma error by its class alone', async () => {
      const { service } = build({ create: vi.fn().mockRejectedValue(new TypeError('52998224725 is not a function')) });
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await service.receive(application).catch(() => undefined);

      expect(logged.mock.calls[0]![0]).toEqual({ reason: 'TypeError' });
    });
  });
});
