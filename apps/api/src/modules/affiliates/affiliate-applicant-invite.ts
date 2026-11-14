// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { freshInvite } from './affiliate-invites.js';
import { openProgram } from './affiliate-program.js';
import { tableFor } from './affiliate-records.js';

/** Who an application says the person is: what the invite needs, and nothing more. */
export interface Applicant {
  name: string;
  email: string;
  phone: string;
}

/**
 * The table an application's affiliate is invited on (plan 2026-11-14): the one named — a table the
 * shop shares — else the shop's default one.
 */
export async function applicantTableId(prisma: PrismaService, storeId: string, tableId: string | null): Promise<string> {
  if (tableId !== null) {
    await tableFor(prisma, storeId, tableId, null);
    return tableId;
  }
  await openProgram(prisma, storeId);
  const table = await prisma.commissionTable.findFirstOrThrow({ where: { storeId, isDefault: true }, select: { id: true } });
  return table.id;
}

/**
 * The affiliate an approved application becomes: `INVITED`, with the invite the shop's own form would
 * send. No CPF and no document — the person gives the CPF on accepting (`cpfRequired`), and the record
 * says the document is pending, as it does for one invited before it was asked. The e-mail goes once
 * the transaction is in, with the token answered here.
 */
export async function inviteApplicantWithin(tx: Prisma.TransactionClient, storeId: string, applicant: Applicant, tableId: string): Promise<{ affiliateId: string; token: string }> {
  const invite = freshInvite(new Date());
  const created = await tx.affiliate.create({
    data: { storeId, name: applicant.name, email: applicant.email, phone: applicant.phone, cpf: null, note: null, tableId, invite: { create: invite.columns } },
    select: { id: true },
  });
  return { affiliateId: created.id, token: invite.token };
}
