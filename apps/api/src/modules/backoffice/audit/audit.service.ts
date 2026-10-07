// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { BackofficeAuditPage } from '@harness-monorepo/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { AuditClient, AuditLine, AuditWriter } from './audit.types.js';
import type { ListAuditDto } from './dto/audit.dto.js';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { BACKOFFICE_AUDIT_PAGE_SIZE, BACKOFFICE_USER_AGENT_MAX_LENGTH } from '../backoffice.constants.js';
import { auditDetailsOf } from './audit-details.js';
import { toAuditEntry } from './audit.mapper.js';

/**
 * The audit record (BEELINK-227): everything the backoffice did. It is written and it is read, and
 * that is all this service can do — there is no method that changes or removes a line, and the
 * table's own trigger refuses both whoever asks.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** `tx` is the transaction of the write being recorded, so the two commit together. */
  async record({ actor, action, target, details, origin }: AuditLine, tx: AuditClient = this.prisma): Promise<void> {
    await tx.backofficeAuditLog.create({
      data: {
        actorKind: actor.kind,
        actorUserId: actor.kind === 'ADMIN' ? actor.userId : null,
        actorLabel: actor.kind === 'ADMIN' ? actor.label : null,
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        targetLabel: target?.label ?? null,
        details: auditDetailsOf(details),
        ip: origin?.ip ?? null,
        userAgent: origin?.userAgent?.slice(0, BACKOFFICE_USER_AGENT_MAX_LENGTH) ?? null,
      },
    });
  }

  /** What the command writes through: nobody signed in, no address — the actor is the command itself. */
  commandTrail(): AuditWriter {
    return { record: (action, note, tx) => this.record({ actor: { kind: 'COMMAND' }, action, target: note?.target, details: note?.details }, tx) };
  }

  /** One page, newest first. The id breaks a tie: it is a UUID v7, which sorts by when it was made. */
  async list({ actorId, actorKind, action, from, to, page = 1, pageSize = BACKOFFICE_AUDIT_PAGE_SIZE }: ListAuditDto): Promise<BackofficeAuditPage> {
    const where: Prisma.BackofficeAuditLogWhereInput = {
      ...(actorId ? { actorUserId: actorId } : {}),
      ...(actorKind ? { actorKind } : {}),
      ...(action ? { action } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.backofficeAuditLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.backofficeAuditLog.count({ where }),
    ]);

    return { entries: rows.map(toAuditEntry), total, page, pageSize };
  }
}
