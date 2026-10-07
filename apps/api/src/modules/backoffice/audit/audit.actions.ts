// Types
import type { BackofficeAuditAction, BackofficeAuditActorKind, BackofficeAuditTargetType } from '@harness-monorepo/contracts';

/**
 * Every action the audit record can name, as values a validator can range over. `satisfies` holds
 * each entry to the contract's union; `audit.actions.spec.ts` holds the list to the whole of it.
 */
export const BACKOFFICE_AUDIT_ACTIONS = [
  'ADMIN_GRANTED',
  'ADMIN_REVOKED',
  'BACKOFFICE_SIGN_IN_CODE_SENT',
  'BACKOFFICE_SIGN_IN_FAILED',
  'BACKOFFICE_SIGNED_IN',
  'BACKOFFICE_SIGNED_OUT',
] as const satisfies readonly BackofficeAuditAction[];

export const BACKOFFICE_AUDIT_ACTOR_KINDS = ['ADMIN', 'COMMAND', 'ANONYMOUS'] as const satisfies readonly BackofficeAuditActorKind[];

export const BACKOFFICE_AUDIT_TARGET_TYPES = ['USER'] as const satisfies readonly BackofficeAuditTargetType[];

/** `SUBJECT_VERB-IN-THE-PAST`: upper-case words joined by underscores, at least two. */
export const BACKOFFICE_AUDIT_ACTION_SHAPE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/;
