// Libs
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';

// App
import { env } from '../../shared/config/env.js';
import { REALTIME_ORIGINS_FRESH_MS, REALTIME_ORIGINS_MISS_MS, REALTIME_ORIGINS_RETRY_MS, RealtimeOrigins, shopHostOfOrigin } from './realtime-origins.js';

/** The database, as far as this reads it: the active domains, and how many times they were asked for. */
function database(domains: string[]) {
  const findMany = vi.fn(async () => domains.map((customDomain) => ({ customDomain })));
  return { findMany, prisma: { store: { findMany } } as unknown as PrismaService, domains };
}

const [WEB = ''] = env.CORS_ORIGINS;

describe('RealtimeOrigins', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("answers the web's own origin without reading anything", async () => {
    const { prisma, findMany } = database([]);

    expect(await new RealtimeOrigins(prisma).allows(WEB)).toBe(true);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("answers the origin of a shop's active domain, and of no other host", async () => {
    const { prisma, findMany } = database(['loja.example']);
    const origins = new RealtimeOrigins(prisma);

    expect(await origins.allows('https://loja.example')).toBe(true);
    expect(await origins.allows('https://outra.example')).toBe(false);
    expect(await origins.allows('https://sub.loja.example')).toBe(false);
    expect(await origins.allows('https://loja.example.evil.example')).toBe(false);
    // Only the active ones are asked for.
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { customDomainStatus: 'ACTIVE', customDomain: { not: null } } }));
  });

  it('answers no request without an origin, and nothing that is not an origin', async () => {
    const { prisma, findMany } = database(['loja.example']);
    const origins = new RealtimeOrigins(prisma);

    for (const origin of [undefined, '', '*', 'null', 'loja.example', 'https://loja.example/', 'https://loja.example/x', 'https://a@loja.example', 'ftp://loja.example']) {
      expect(await origins.allows(origin)).toBe(false);
    }
    expect(findMany).not.toHaveBeenCalled();
  });

  it('reads once for a minute, and again after it', async () => {
    const { prisma, findMany } = database(['loja.example']);
    const origins = new RealtimeOrigins(prisma);

    await origins.allows('https://loja.example');
    await origins.allows('https://loja.example');
    vi.advanceTimersByTime(REALTIME_ORIGINS_FRESH_MS - 1);
    await origins.allows('https://loja.example');
    expect(findMany).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    await origins.allows('https://loja.example');
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('shares one read among everyone who asks while it is in flight', async () => {
    const { prisma, findMany } = database(['loja.example']);
    const origins = new RealtimeOrigins(prisma);

    const answers = await Promise.all([origins.allows('https://loja.example'), origins.allows('https://loja.example'), origins.allows('https://outra.example')]);

    expect(answers).toEqual([true, true, false]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('learns of a domain made active since the copy was read, within seconds and not at every miss', async () => {
    const { prisma, findMany, domains } = database([]);
    const origins = new RealtimeOrigins(prisma);

    expect(await origins.allows('https://nova.example')).toBe(false);
    domains.push('nova.example');
    // A flood of unknown origins costs no read while the copy is this young.
    for (let attempt = 0; attempt < 20; attempt += 1) expect(await origins.allows('https://nova.example')).toBe(false);
    expect(findMany).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(REALTIME_ORIGINS_MISS_MS);
    expect(await origins.allows('https://nova.example')).toBe(true);
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('forgets a domain that is no longer active when the copy is read again', async () => {
    const { prisma, domains } = database(['loja.example']);
    const origins = new RealtimeOrigins(prisma);

    expect(await origins.allows('https://loja.example')).toBe(true);
    domains.length = 0;
    vi.advanceTimersByTime(REALTIME_ORIGINS_FRESH_MS);
    expect(await origins.allows('https://loja.example')).toBe(false);
  });

  it('keeps the last copy when a read fails, and waits before the next try', async () => {
    const { prisma, findMany } = database(['loja.example']);
    const origins = new RealtimeOrigins(prisma);
    await origins.allows('https://loja.example');

    findMany.mockRejectedValue(new Error('database is down'));
    vi.advanceTimersByTime(REALTIME_ORIGINS_FRESH_MS);
    expect(await origins.allows('https://loja.example')).toBe(true);
    expect(await origins.allows('https://loja.example')).toBe(true);
    expect(findMany).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(REALTIME_ORIGINS_RETRY_MS);
    await origins.allows('https://loja.example');
    expect(findMany).toHaveBeenCalledTimes(3);
  });

  it('answers nobody but the web when the first read fails', async () => {
    const { prisma, findMany } = database(['loja.example']);
    findMany.mockRejectedValue(new Error('database is down'));
    const origins = new RealtimeOrigins(prisma);

    expect(await origins.allows('https://loja.example')).toBe(false);
    expect(await origins.allows(WEB)).toBe(true);
  });
});

describe('shopHostOfOrigin', () => {
  it('reads only https on its own port in production', () => {
    expect(shopHostOfOrigin('https://loja.example', true)).toBe('loja.example');
    expect(shopHostOfOrigin('https://LOJA.example', true)).toBeNull();
    for (const origin of ['http://loja.example', 'https://loja.example:8443', 'http://loja.example:3000']) expect(shopHostOfOrigin(origin, true)).toBeNull();
  });

  it('takes the scheme and the port that came in development and under test', () => {
    expect(shopHostOfOrigin('http://lvh.me:3800', false)).toBe('lvh.me');
    expect(shopHostOfOrigin('http://loja.localhost:3100', false)).toBe('loja.localhost');
    expect(shopHostOfOrigin('https://loja.example', false)).toBe('loja.example');
  });
});
