// Types
import type { AffiliateProgramModel } from '../../generated/prisma/models.js';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { AFFILIATE_PROGRAM_DEFAULTS, DEFAULT_COMMISSION_TABLE } from './affiliates.constants.js';

/**
 * The shop's programme, opened with its default table the first time anyone asks — both switched
 * off. The default table needs an id from the start: it is where a product's own form writes its
 * rate. Both inserts are ON CONFLICT DO NOTHING, so two first readings at once open one programme
 * and one default table, and the partial unique index is the backstop.
 */
export async function openProgram(prisma: PrismaService, storeId: string): Promise<AffiliateProgramModel> {
  const program = await prisma.affiliateProgram.findUnique({ where: { storeId } });
  if (program) return program;

  const { enabled, attributionDays, payoutDelayDays } = AFFILIATE_PROGRAM_DEFAULTS;
  await prisma.$transaction([
    prisma.affiliateProgram.createMany({ data: [{ storeId, enabled, attributionDays, payoutDelayDays }], skipDuplicates: true }),
    prisma.commissionTable.createMany({ data: [{ storeId, ...DEFAULT_COMMISSION_TABLE, isDefault: true }], skipDuplicates: true }),
  ]);
  return prisma.affiliateProgram.findUniqueOrThrow({ where: { storeId } });
}
