// Types
import type { BackofficeAuditAction, BackofficeAuditDetails, BackofficeAuditEntry, BackofficeAuditTargetType } from '@harness-monorepo/contracts';
import type { BackofficeAuditLogModel } from '../../../generated/prisma/models.js';

/**
 * A row as the wire carries it, field by field. The casts read back what `AuditService.record` — the
 * only writer — was typed to write: the columns are text and JSON so a new code needs no migration.
 */
export function toAuditEntry(row: BackofficeAuditLogModel): BackofficeAuditEntry {
  return {
    id: row.id,
    actor: { kind: row.actorKind, userId: row.actorUserId, label: row.actorLabel },
    action: row.action as BackofficeAuditAction,
    target: row.targetType && row.targetId ? { type: row.targetType as BackofficeAuditTargetType, id: row.targetId, label: row.targetLabel } : null,
    details: row.details as BackofficeAuditDetails,
    ip: row.ip,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  };
}
