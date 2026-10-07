// Types
import type { BackofficeAuditAction, BackofficeAuditActorKind, BackofficeAuditTargetType } from '@harness-monorepo/contracts';

// App
import { BACKOFFICE_AUDIT_ACTIONS, BACKOFFICE_AUDIT_ACTION_SHAPE, BACKOFFICE_AUDIT_ACTOR_KINDS, BACKOFFICE_AUDIT_TARGET_TYPES } from './audit.actions.js';

/** `true` only when the two unions are the same: a code added to the contract and not to the list fails to compile. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('the audit action codes', () => {
  it('are the whole of the contract, no more and no less', () => {
    const actions: Same<(typeof BACKOFFICE_AUDIT_ACTIONS)[number], BackofficeAuditAction> = true;
    const kinds: Same<(typeof BACKOFFICE_AUDIT_ACTOR_KINDS)[number], BackofficeAuditActorKind> = true;
    const targets: Same<(typeof BACKOFFICE_AUDIT_TARGET_TYPES)[number], BackofficeAuditTargetType> = true;

    expect([actions, kinds, targets]).toEqual([true, true, true]);
    expect(new Set(BACKOFFICE_AUDIT_ACTIONS).size).toBe(BACKOFFICE_AUDIT_ACTIONS.length);
  });

  it.each(BACKOFFICE_AUDIT_ACTIONS)('%s reads SUBJECT_VERB, in upper case', (action) => {
    expect(action).toMatch(BACKOFFICE_AUDIT_ACTION_SHAPE);
  });

  it('refuses a code in any other shape', () => {
    for (const wrong of ['granted', 'AdminGranted', 'ADMIN', 'ADMIN-GRANTED', 'ADMIN__GRANTED', '_ADMIN_GRANTED']) {
      expect(wrong).not.toMatch(BACKOFFICE_AUDIT_ACTION_SHAPE);
    }
  });
});
