// Types
import type { BackofficeAuditAction, BackofficeAuditDetails, BackofficeAuditTargetType } from '@harness-monorepo/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';

/** Who did it: an administrator, the server-side command, or — for a sign-in refused — nobody known. */
export type AuditActor =
  | { kind: 'ADMIN'; userId: string; label: string }
  | { kind: 'COMMAND' }
  | { kind: 'ANONYMOUS' };

export interface AuditTarget {
  type: BackofficeAuditTargetType;
  id: string;
  /** What a person would call it: an e-mail, a shop's slug. */
  label?: string | null;
}

/** Where a request came from, as the API saw it. The command has none. */
export interface AuditOrigin {
  ip: string | null;
  userAgent: string | null;
}

export interface AuditLine {
  actor: AuditActor;
  action: BackofficeAuditAction;
  target?: AuditTarget | null;
  details?: BackofficeAuditDetails;
  origin?: AuditOrigin;
}

/** What a caller says of a line; the trail it writes through already knows who, and from where. */
export interface AuditNote {
  /** Only where the request's administrator is not the one acting: a sign-in, which has none yet. */
  actor?: AuditActor;
  target?: AuditTarget | null;
  details?: BackofficeAuditDetails;
}

/** The transaction a write runs in — the audit line commits with it, or not at all. */
export type AuditClient = Pick<Prisma.TransactionClient, 'backofficeAuditLog'>;

/**
 * What a backoffice service records through. A request's is its `AuditTrail`, bound to the
 * administrator, the address and the actions its handler declared; the command's is its own.
 */
export interface AuditWriter {
  record(action: BackofficeAuditAction, note?: AuditNote, tx?: AuditClient): Promise<void>;
}
