// Types
import type { PlatformAdminModel, UserModel } from '../../../generated/prisma/models.js';

// App
import { BACKOFFICE_SESSION_IDLE_MINUTES } from '../backoffice.constants.js';
import { isActiveAdmin, sessionIsAlive } from './backoffice-session.service.js';

const NOW = new Date('2026-10-06T12:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);
const minutesAhead = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

describe('a backoffice session', () => {
  const alive = { revokedAt: null, lastSeenAt: minutesAgo(1), expiresAt: minutesAhead(60) };

  it('is alive while used, unended and before its end', () => {
    expect(sessionIsAlive(alive, NOW)).toBe(true);
  });

  it('is over once ended', () => {
    expect(sessionIsAlive({ ...alive, revokedAt: minutesAgo(0) }, NOW)).toBe(false);
  });

  it('is over at its end, however recently it was used', () => {
    expect(sessionIsAlive({ ...alive, expiresAt: NOW }, NOW)).toBe(false);
  });

  it('is over once left idle', () => {
    expect(sessionIsAlive({ ...alive, lastSeenAt: minutesAgo(BACKOFFICE_SESSION_IDLE_MINUTES - 1) }, NOW)).toBe(true);
    expect(sessionIsAlive({ ...alive, lastSeenAt: minutesAgo(BACKOFFICE_SESSION_IDLE_MINUTES) }, NOW)).toBe(false);
  });
});

describe('who administers the platform', () => {
  const user = { emailVerifiedAt: NOW, storeId: null } as UserModel;
  const admin = { revokedAt: null } as PlatformAdminModel;

  it('is an account with the role standing', () => {
    expect(isActiveAdmin({ ...user, platformAdmin: admin })).toBe(true);
  });

  it.each([
    ['one with no role', { ...user, platformAdmin: null }],
    ['one whose role was revoked', { ...user, platformAdmin: { ...admin, revokedAt: NOW } }],
    ['one whose e-mail is not verified', { ...user, emailVerifiedAt: null, platformAdmin: admin }],
    ["a shop's account", { ...user, storeId: 'a-shop', platformAdmin: admin }],
  ])('is not %s', (_case, owner) => {
    expect(isActiveAdmin(owner)).toBe(false);
  });
});
