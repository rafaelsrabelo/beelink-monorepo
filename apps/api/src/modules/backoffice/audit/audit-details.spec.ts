// Types
import type { BackofficeAuditDetails } from '@harness-monorepo/contracts';

// App
import { AUDIT_DETAIL_MAX_KEYS, AUDIT_DETAIL_MAX_LENGTH, auditDetailsOf } from './audit-details.js';

describe('the details of an audit line', () => {
  it('keeps flat, small facts as they are', () => {
    const details = { step: 'CODE', from: 'ACTIVE', to: 'SUSPENDED', count: 3, forced: false, note: null };

    expect(auditDetailsOf(details)).toEqual(details);
    expect(auditDetailsOf()).toEqual({});
  });

  it.each(['password', 'newPassword', 'passwordHash', 'senha', 'token', 'refreshToken', 'accessToken', 'challengeToken', 'code', 'signInCode', 'secret', 'sealedSecret', 'apiKey', 'api_key', 'authorization', 'cookie', 'cpf'])(
    'refuses a key that names a secret: %s',
    (key) => {
      expect(() => auditDetailsOf({ [key]: 'x' })).toThrow(/never carries a secret/);
    },
  );

  it('refuses anything that is not flat', () => {
    expect(() => auditDetailsOf({ body: { name: 'Ana' } } as unknown as BackofficeAuditDetails)).toThrow(/string, a number, a boolean or null/);
    expect(() => auditDetailsOf({ list: ['a'] } as unknown as BackofficeAuditDetails)).toThrow(/string, a number, a boolean or null/);
  });

  it('refuses a long value and a long list of them', () => {
    expect(() => auditDetailsOf({ note: 'x'.repeat(AUDIT_DETAIL_MAX_LENGTH + 1) })).toThrow(/is short/);
    expect(() => auditDetailsOf(Object.fromEntries(Array.from({ length: AUDIT_DETAIL_MAX_KEYS + 1 }, (_, index) => [`k${index}`, index])))).toThrow(/at most/);
  });
});
