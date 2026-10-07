// Types
import type { BackofficeAuditAction } from '@harness-monorepo/contracts';
import type { AuditTrail } from './audit/audit-trail.js';
import type { AuditOrigin } from './audit/audit.types.js';

/** The administrator behind a request, put there by `BackofficeGuard`. */
export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  sessionId: string;
}

/** What the guard and the audit interceptor read of a request, and leave on it. */
export interface BackofficeRequest {
  method: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  backofficeAdmin?: AuthenticatedAdmin;
  auditTrail?: AuditTrail;
}

export const AUDITED_KEY = 'backoffice:audited';
export const UNAUDITED_KEY = 'backoffice:unaudited';

/** What `@Audited` leaves on a handler. */
export type AuditedActions = readonly [BackofficeAuditAction, ...BackofficeAuditAction[]];

/** The address and the browser as the API saw them: this is staff, and where they act from is part of the record. */
export function originOf(request: BackofficeRequest): AuditOrigin {
  const userAgent = request.headers['user-agent'];
  return { ip: request.ip ?? null, userAgent: typeof userAgent === 'string' ? userAgent : null };
}
