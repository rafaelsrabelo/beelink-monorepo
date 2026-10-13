// Nest
import { Logger } from '@nestjs/common';

// App
import { CourierApplicationMailer } from './courier-application-mailer.js';

// Types
import type { MailService } from '../../shared/mail/mail.service.js';
import type { PrismaService } from '../../shared/prisma/prisma.service.js';

const NOW = new Date('2026-10-13T15:00:00.000Z');
const NOTICE = '0199e000-0000-7000-8000-0000000000b2';
const OLDER = '0199e000-0000-7000-8000-0000000000a1';

/** A notice as the outbox reads it, with the application it belongs to. Every value is made up. */
const owed = {
  createdAt: new Date('2026-10-13T14:59:00.000Z'),
  application: { name: 'Zuleica Tavares Lima', email: 'zuleica.tavares@exemplo.test', city: 'FORTALEZA_CE' },
};

/** Every way that person could show up in a line of the log. */
const PERSONAL = /Zuleica|Tavares|Lima|exemplo\.test|FORTALEZA/i;

/** The same notice, of an application kept with no address (BEELINK-328). */
const addressless = { ...owed, application: { ...owed.application, email: null } };

interface Scene {
  /** What the outbox finds under the id it claimed; null is a notice taken out since. */
  notice?: typeof owed | typeof addressless | null;
  /** Another notice of the same address, older than this one. */
  older?: { id: string } | null;
  /** Whether the provider took the e-mail. */
  went?: boolean;
  /** Which try this is, as the claim counted it. */
  attempts?: number;
}

/** The outbox over one claimed row, with the database and the provider stood in for. */
function build({ notice = owed, older = null, went = true, attempts = 1 }: Scene = {}) {
  const claim = vi.fn().mockResolvedValue([{ id: NOTICE, attempts }]);
  const findUnique = vi.fn().mockResolvedValue(notice);
  const findFirst = vi.fn().mockResolvedValue(older);
  const update = vi.fn().mockResolvedValue({ id: NOTICE });
  const prisma = { $queryRaw: claim, courierApplicationNotice: { findUnique, findFirst, update } } as unknown as PrismaService;
  const send = vi.fn().mockResolvedValue(went);
  const mail = { sendCourierApplicationReceived: send } as unknown as MailService;

  return { mailer: new CourierApplicationMailer(prisma, mail), claim, findUnique, findFirst, update, send };
}

describe('CourierApplicationMailer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('claims from its own table', async () => {
    const { mailer, claim } = build();

    await mailer.flush();

    expect((claim.mock.calls[0]![0] as { strings: readonly string[] }).strings.join('?')).toContain('UPDATE "courier_application_notices"');
  });

  it("sends the e-mail to the application's address, by its name and its city's, and marks it sent", async () => {
    const { mailer, send, update } = build();

    await expect(mailer.flush()).resolves.toBe(1);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('zuleica.tavares@exemplo.test', { name: 'Zuleica Tavares Lima', city: 'Fortaleza' });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ where: { id: NOTICE }, data: { sentAt: NOW } });
  });

  // The column is text: a city closed since leaves its code there, and the person is told all the same.
  it('sends it with no city when the code kept names none', async () => {
    const { mailer, send } = build({ notice: { ...owed, application: { ...owed.application, city: 'SOBRAL_CE' } } });

    await expect(mailer.flush()).resolves.toBe(1);

    expect(send).toHaveBeenCalledWith('zuleica.tavares@exemplo.test', { name: 'Zuleica Tavares Lima', city: null });
  });

  describe('one e-mail an address', () => {
    it('looks for an older notice of an application with the same e-mail, the id deciding between two of one instant', async () => {
      const { mailer, findFirst } = build();

      await mailer.flush();

      expect(findFirst).toHaveBeenCalledTimes(1);
      expect(findFirst.mock.calls[0]![0]).toMatchObject({
        where: {
          application: { email: 'zuleica.tavares@exemplo.test' },
          OR: [{ createdAt: { lt: owed.createdAt } }, { createdAt: owed.createdAt, id: { lt: NOTICE } }],
        },
      });
    });

    it('sends nothing for a notice that is not the oldest of its address, and is done with it', async () => {
      const { mailer, send, update } = build({ older: { id: OLDER } });

      await expect(mailer.flush()).resolves.toBe(0);

      expect(send).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith({ where: { id: NOTICE }, data: { sentAt: NOW } });
    });

    it('sends the oldest of its address, whatever was written after it', async () => {
      const { mailer, send } = build({ older: null });

      await expect(mailer.flush()).resolves.toBe(1);

      expect(send).toHaveBeenCalledTimes(1);
    });
  });

  // The service writes no notice for one, so this is a row written some other way. Asked for the
  // older notice of "no address", the list would answer with any other application that has none.
  it('sends nothing for a notice whose application has no address, looks for no older one, and is done with it', async () => {
    const { mailer, send, findFirst, update } = build({ notice: addressless });

    await expect(mailer.flush()).resolves.toBe(0);

    expect(send).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ where: { id: NOTICE }, data: { sentAt: NOW } });
  });

  // Deleting an application deletes what it is owed: a row claimed a moment before is simply gone.
  it('sends nothing, and writes nothing, for a notice taken out with its application', async () => {
    const { mailer, send, findFirst, update } = build({ notice: null });

    await expect(mailer.flush()).resolves.toBe(0);

    expect(send).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  describe('an e-mail that did not go', () => {
    it.each([
      [1, 1],
      [2, 2],
      [3, 4],
      [4, 8],
    ])('waits after the try number %i for %i minute(s), and is not marked sent', async (attempts, minutes) => {
      const { mailer, update } = build({ went: false, attempts });
      const warned = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await expect(mailer.flush()).resolves.toBe(0);

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith({ where: { id: NOTICE }, data: { nextAttemptAt: new Date(NOW.getTime() + minutes * 60_000) } });
      expect(warned).not.toHaveBeenCalled();
    });

    // `sentAt` stays null: a notice given up is told apart from one sent, and arming it again is one UPDATE.
    it('is given up on the fifth try, left as it is, and named in the log by the id of its notice alone', async () => {
      const { mailer, update } = build({ went: false, attempts: 5 });
      const warned = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      await expect(mailer.flush()).resolves.toBe(0);

      expect(update).not.toHaveBeenCalled();
      expect(warned).toHaveBeenCalledTimes(1);
      expect(warned.mock.calls[0]).toEqual([{ noticeId: NOTICE }, 'Gave up on a courier application notice']);
      expect(JSON.stringify(warned.mock.calls)).not.toMatch(PERSONAL);
    });
  });

  it('logs nothing at all for an e-mail that went, or for one left to an older notice', async () => {
    const lines = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map((level) => vi.spyOn(Logger.prototype, level).mockImplementation(() => undefined));

    await build().mailer.flush();
    await build({ older: { id: OLDER } }).mailer.flush();

    for (const line of lines) expect(line).not.toHaveBeenCalled();
  });
});
