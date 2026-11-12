// Nest
import { ConflictException, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliateStatus, AffiliateStatusDetails } from '@harness-monorepo/contracts';

// App
import type { MailService } from '../../shared/mail/mail.service.js';
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { AFFILIATE_INVITE_TTL_MS, UUID, affiliateError } from './affiliates.constants.js';
import { affiliateInclude } from './affiliates.mapper.js';

/*
  What the shop's affiliate services share (IMPULSEIA-103, split 12/11/2026): the refusals, finding an
  affiliate or a table of the shop, and the invite's e-mail.
*/

const DAY_MS = 24 * 60 * 60 * 1000;

export const tableMissing = () => new NotFoundException(affiliateError('COMMISSION_TABLE_NOT_FOUND', 'No such commission table in this shop'));
export const affiliateMissing = () => new NotFoundException(affiliateError('AFFILIATE_NOT_FOUND', 'No such affiliate in this shop'));
export const emailTaken = () => new ConflictException(affiliateError('AFFILIATE_EMAIL_TAKEN', 'Another affiliate of this shop has that e-mail'));
export const cpfTaken = () => new ConflictException(affiliateError('AFFILIATE_CPF_TAKEN', 'Another affiliate of this shop has that CPF'));
export const statusRefused = (status: AffiliateStatus) =>
  new ConflictException(affiliateError<AffiliateStatusDetails>('AFFILIATE_STATUS_INVALID', `Not allowed while ${status}`, { status }));

/** An affiliate of this shop's; another shop's, or none at all, is one answer. */
export async function affiliateOf(prisma: PrismaService, storeId: string, affiliateId: string) {
  const row = UUID.test(affiliateId) ? await prisma.affiliate.findFirst({ where: { id: affiliateId, storeId }, include: affiliateInclude }) : null;
  if (!row) throw affiliateMissing();
  return row;
}

/**
 * A table an affiliate may be put on: the shop's, and shared — or their own, when `affiliateId` is
 * theirs. Another affiliate's own commission is nobody else's (12/11/2026).
 */
export async function tableFor(prisma: PrismaService, storeId: string, tableId: string, affiliateId: string | null): Promise<void> {
  const row = UUID.test(tableId) ? await prisma.commissionTable.findFirst({ where: { id: tableId, storeId }, select: { affiliateId: true } }) : null;
  if (!row) throw tableMissing();
  if (row.affiliateId !== null && row.affiliateId !== affiliateId) {
    throw new ConflictException(affiliateError('COMMISSION_TABLE_PERSONAL', "That table is another affiliate's own commission"));
  }
}

/** Whether another affiliate of the shop, not ended, has the e-mail or the CPF: which unique key a refused write broke. */
export async function takenBy(prisma: PrismaService, storeId: string, field: { cpf: string } | { email: string }, exceptId: string | null): Promise<boolean> {
  const other = await prisma.affiliate.findFirst({ where: { storeId, ...field, status: { not: 'ENDED' }, ...(exceptId ? { id: { not: exceptId } } : {}) }, select: { id: true } });
  return other !== null;
}

export async function sendInvite(prisma: PrismaService, mail: MailService, storeId: string, invited: { name: string; email: string }, token: string): Promise<void> {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { name: true } });
  await mail.sendAffiliateInvite(invited.email, { name: invited.name, shopName: store.name, days: AFFILIATE_INVITE_TTL_MS / DAY_MS }, token);
}
