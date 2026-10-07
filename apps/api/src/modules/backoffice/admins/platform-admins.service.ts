// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { BackofficeAdmin } from '@harness-monorepo/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { AuditWriter } from '../audit/audit.types.js';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { toBackofficeAdmin } from './platform-admins.mapper.js';

/** What granting did: the command treats "already one" as done, the route as a conflict. */
export interface GrantOutcome {
  admin: BackofficeAdmin;
  granted: boolean;
}

/**
 * Who administers the platform (BEELINK-227), and the only writer of `platform_admins`. The role is
 * granted to an existing bee-link account whose e-mail is verified — by an administrator, or by the
 * command that makes the first one — and every change is recorded in the transaction that makes it.
 */
@Injectable()
export class PlatformAdminsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The administrators there are now, in the order they were granted. */
  async list(): Promise<BackofficeAdmin[]> {
    const rows = await this.prisma.platformAdmin.findMany({ where: { revokedAt: null }, include: { user: true }, orderBy: [{ grantedAt: 'asc' }, { userId: 'asc' }] });
    const granterIds = [...new Set(rows.flatMap((row) => (row.grantedByUserId ? [row.grantedByUserId] : [])))];
    const granters = await this.prisma.user.findMany({ where: { id: { in: granterIds } }, select: { id: true, name: true, email: true } });
    const byId = new Map(granters.map((granter) => [granter.id, granter]));

    return rows.map((row) => toBackofficeAdmin(row, row.grantedByUserId ? byId.get(row.grantedByUserId) : undefined));
  }

  /**
   * `grantedBy` is the administrator granting, or null for the command. Idempotent: an account that
   * is an administrator already is answered as it stands, and nothing is written or recorded.
   */
  async grant(email: string, grantedBy: string | null, trail: AuditWriter): Promise<GrantOutcome> {
    // bee-link's own accounts only: a shop's customer never administers anything.
    const user = await this.prisma.user.findFirst({ where: { email, storeId: null } });
    if (!user) throw new NotFoundException({ errorCode: 'BACKOFFICE_USER_NOT_FOUND', message: 'No bee-link account has this e-mail' });
    if (!user.emailVerifiedAt) {
      throw new ConflictException({ errorCode: 'BACKOFFICE_USER_NOT_VERIFIED', message: 'The account has not verified its e-mail' });
    }

    return this.prisma.$transaction(async (tx) => {
      await lockAdmins(tx);

      const current = await tx.platformAdmin.findUnique({ where: { userId: user.id } });
      if (current && !current.revokedAt) {
        const granter = current.grantedByUserId ? await tx.user.findUnique({ where: { id: current.grantedByUserId } }) : null;
        return { admin: toBackofficeAdmin({ ...current, user }, granter ?? undefined), granted: false };
      }

      const fresh = { grantedAt: new Date(), grantedByUserId: grantedBy, revokedAt: null, revokedByUserId: null };
      const row = await tx.platformAdmin.upsert({ where: { userId: user.id }, create: { userId: user.id, ...fresh }, update: fresh });
      await trail.record('ADMIN_GRANTED', { target: { type: 'USER', id: user.id, label: user.email } }, tx);

      const granter = grantedBy ? await tx.user.findUnique({ where: { id: grantedBy } }) : null;
      return { admin: toBackofficeAdmin({ ...row, user }, granter ?? undefined), granted: true };
    });
  }

  /**
   * Takes the role away, and with it every backoffice session and pending sign-in of the account.
   * Never the last one: a platform with no administrator can only be mended from the server.
   */
  async revoke(userId: string, revokedBy: string, trail: AuditWriter): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Two administrators revoking each other at once would each see the other still standing.
      await lockAdmins(tx);

      const admin = await tx.platformAdmin.findFirst({ where: { userId, revokedAt: null }, include: { user: true } });
      if (!admin) throw new NotFoundException({ errorCode: 'BACKOFFICE_ADMIN_NOT_FOUND', message: 'This account is not an administrator' });

      if ((await tx.platformAdmin.count({ where: { revokedAt: null } })) <= 1) {
        throw new ConflictException({ errorCode: 'BACKOFFICE_LAST_ADMIN', message: 'The last administrator cannot be revoked' });
      }

      const now = new Date();
      await tx.platformAdmin.update({ where: { userId }, data: { revokedAt: now, revokedByUserId: revokedBy } });
      await tx.backofficeSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
      await tx.backofficeSignInChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: now } });
      await trail.record('ADMIN_REVOKED', { target: { type: 'USER', id: userId, label: admin.user.email } }, tx);
    });
  }
}

/** One writer of `platform_admins` at a time, until its transaction ends. */
async function lockAdmins(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('platform_admins', 0))`;
}
