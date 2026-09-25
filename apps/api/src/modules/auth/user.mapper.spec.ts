// Types
import type { UserModel } from '../../generated/prisma/models.js';

// App
import { toUser } from './user.mapper.js';

const row = {
  id: '0199a0f1-0000-7000-8000-000000000000',
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA',
  emailVerifiedAt: null,
  storeId: null,
  createdAt: new Date('2026-09-10T12:00:00.000Z'),
  updatedAt: new Date('2026-09-10T12:00:00.000Z'),
} satisfies UserModel;

describe('toUser', () => {
  it('leaves the password hash in the database', () => {
    expect(JSON.stringify(toUser(row))).not.toContain('argon2');
  });

  it('turns the verification date into the flag the apps render', () => {
    expect(toUser(row).emailVerified).toBe(false);
    expect(toUser({ ...row, emailVerifiedAt: new Date() }).emailVerified).toBe(true);
  });

  it('sends dates as ISO-8601 strings, as the contract says', () => {
    expect(toUser(row).createdAt).toBe('2026-09-10T12:00:00.000Z');
  });
});
