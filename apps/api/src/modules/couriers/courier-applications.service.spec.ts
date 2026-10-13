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

function build(upsert = vi.fn().mockResolvedValue({ id: '0199e000-0000-7000-8000-000000000001' })) {
  const prisma = { courierApplication: { upsert } } as unknown as PrismaService;

  return { service: new CourierApplicationsService(prisma), upsert };
}

describe('CourierApplicationsService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps an application in one statement, keyed by the CPF', async () => {
    const { service, upsert } = build();

    await expect(service.receive(application)).resolves.toBeUndefined();

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0]![0]).toMatchObject({
      where: { document: '52998224725' },
      create: {
        document: '52998224725',
        name: 'Zuleica Tavares',
        email: 'zuleica.tavares@exemplo.test',
        whatsapp: '5585987654321',
        city: 'FORTALEZA_CE',
        vehicle: 'MOTORCYCLE',
      },
    });
  });

  it('records the terms in force on the server, taken at the moment it arrived', async () => {
    const { service, upsert } = build();

    await service.receive(application);

    const { create, update } = upsert.mock.calls[0]![0] as { create: object; update: object };
    expect(create).toMatchObject({ termsVersion: LEGAL_VERSION, termsAcceptedAt: NOW });
    expect(update).toMatchObject({ termsVersion: LEGAL_VERSION, termsAcceptedAt: NOW });
  });

  // The DTO has no such field and the pipe refuses one; this is the service not trusting that.
  it('reads neither the version nor the moment from what it was handed', async () => {
    const { service, upsert } = build();
    const smuggled = { ...application, termsVersion: '1999-01-01', termsAcceptedAt: new Date(0), createdAt: new Date(0) };

    await service.receive(smuggled);

    const { create, update } = upsert.mock.calls[0]![0] as { create: object; update: object };
    for (const written of [create, update]) {
      expect(written).toMatchObject({ termsVersion: LEGAL_VERSION, termsAcceptedAt: NOW });
      expect(written).not.toHaveProperty('createdAt');
    }
  });

  it('replaces what was kept of a CPF already on the list, and leaves its first day alone', async () => {
    const { service, upsert } = build();

    await service.receive({ ...application, name: 'Zuleica T. Brandão', vehicle: 'CAR' });

    const { update } = upsert.mock.calls[0]![0] as { update: Record<string, unknown> };
    expect(update).toEqual({
      name: 'Zuleica T. Brandão',
      email: 'zuleica.tavares@exemplo.test',
      whatsapp: '5585987654321',
      city: 'FORTALEZA_CE',
      vehicle: 'CAR',
      termsVersion: LEGAL_VERSION,
      termsAcceptedAt: NOW,
    });
  });

  /** The trap: a field no person sees was filled in. Success is answered; nothing happens. */
  it('answers a body that fell into the trap as if saved, and saves nothing', async () => {
    const { service, upsert } = build();

    await expect(service.receive({ ...application, website: 'http://spam.test' })).resolves.toBeUndefined();

    expect(upsert).not.toHaveBeenCalled();
  });

  // An untouched hidden input travels as an empty string: that is a person, not a robot.
  it('keeps an application whose trap is there and empty', async () => {
    const { service, upsert } = build();

    await service.receive({ ...application, website: '' });

    expect(upsert).toHaveBeenCalledTimes(1);
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
      const { service } = build(vi.fn().mockRejectedValue(refusal));
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
      const { service } = build(vi.fn().mockRejectedValue(refusal));
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
      const { service } = build(vi.fn().mockRejectedValue(odd));
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await service.receive(application).catch(() => undefined);

      expect(logged.mock.calls[0]![0]).toEqual({ reason: 'UNKNOWN' });
    });

    it('names what was thrown and is no error as unknown', async () => {
      const { service } = build(vi.fn().mockRejectedValue('52998224725'));
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await service.receive(application).catch(() => undefined);

      expect(logged.mock.calls[0]![0]).toEqual({ reason: 'UNKNOWN' });
    });

    it('names a failure that is no Prisma error by its class alone', async () => {
      const { service } = build(vi.fn().mockRejectedValue(new TypeError('52998224725 is not a function')));
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      await service.receive(application).catch(() => undefined);

      expect(logged.mock.calls[0]![0]).toEqual({ reason: 'TypeError' });
    });
  });
});
