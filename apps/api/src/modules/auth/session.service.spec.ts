// Libs
import { describe, expect, it, vi } from 'vitest';

// Nest
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { RealtimePublisher } from '../realtime/realtime-publisher.js';

// App
import { SessionService } from './session.service.js';

function sessionsWith(refreshRecord: unknown = null) {
  const prisma = {
    session: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      updateManyAndReturn: vi.fn(async () => [{ id: 's1' }, { id: 's2' }]),
    },
    refreshToken: { findUnique: vi.fn(async () => refreshRecord) },
  };
  const realtime = { endSessions: vi.fn() };
  const service = new SessionService(
    prisma as unknown as PrismaService,
    new JwtService({ secret: 'a-secret-long-enough-for-these-tests' }),
    realtime as unknown as RealtimePublisher,
  );
  return { service, prisma, realtime };
}

/** A ticket is checked once, at the door: every way a session ends has to close its sockets too. */
describe('SessionService — the sockets of a session that ends', () => {
  it('closes them on sign-out', async () => {
    const { service, realtime } = sessionsWith({ sessionId: 's9' });
    await service.revokeByRefreshToken('token');
    expect(realtime.endSessions).toHaveBeenCalledWith(['s9']);
  });

  it("closes every device's on a password reset", async () => {
    const { service, prisma, realtime } = sessionsWith();
    await service.revokeAllForUser('u1');
    expect(prisma.session.updateManyAndReturn).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }));
    expect(realtime.endSessions).toHaveBeenCalledWith(['s1', 's2']);
  });

  it('closes them when a spent refresh token comes back, which revokes its session', async () => {
    const reused = {
      sessionId: 's7',
      usedAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 60_000),
      session: { revokedAt: null, audience: 'OWNER', user: { storeId: null } },
    };
    const { service, realtime } = sessionsWith(reused);
    await expect(service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(realtime.endSessions).toHaveBeenCalledWith(['s7']);
  });
});
