// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { ShopAffiliate } from '@harness-monorepo/contracts';

// App
import { MailService } from '../../shared/mail/mail.service.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { claimDocument } from './affiliate-document-claims.js';
import { freshInvite } from './affiliate-invites.js';
import { openProgram } from './affiliate-program.js';
import { affiliateOf, cpfTaken, emailTaken, sendInvite, tableFor, tableMissing, takenBy } from './affiliate-records.js';
import { affiliateError, isForeignKeyViolation, isUniqueViolation } from './affiliates.constants.js';
import { affiliateInclude, toShopAffiliate } from './affiliates.mapper.js';
import type { CreateAffiliateDto, UpdateAffiliateDto } from './dto/affiliate.dto.js';
import { checkOwnCommission, createOwnTable, replaceOwnRates } from './own-commission.js';

/** Two own tables made at once may pick the same generated name; the one refused tries the next. */
const NAME_ATTEMPTS = 3;

const eitherTableOrCommission = () => new BadRequestException(affiliateError('AFFILIATE_INVALID', 'Either a shared table or an own commission, and not both'));

/**
 * Inviting an affiliate and changing what they are paid (IMPULSEIA-103; the user's review of
 * 12/11/2026 added their own commission and their identity document). Everything an invite writes —
 * the photos taken out of waiting, the own table, the affiliate, the invite — is one transaction, so
 * a refused invite leaves no table behind and its photos still waiting to be named again.
 */
@Injectable()
export class AffiliateRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly mail: MailService,
  ) {}

  /** `INVITED`, and the invite e-mailed. The programme need not be on: a list can be made before it opens. */
  async create(storeSlug: string, userId: string, dto: CreateAffiliateDto): Promise<ShopAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await openProgram(this.prisma, storeId);
    if ((dto.tableId === undefined) === (dto.commission === undefined)) throw eitherTableOrCommission();
    if (dto.tableId !== undefined) await tableFor(this.prisma, storeId, dto.tableId, null);
    if (dto.commission) await checkOwnCommission(this.prisma, storeId, dto.commission);

    const invite = freshInvite(new Date());
    const row = await this.withNameRetry(
      () =>
        this.prisma.$transaction(async (tx) => {
          const document = dto.document ? await claimDocument(tx, storeId, dto.document, new Date()) : null;
          const tableId = dto.commission ? await createOwnTable(tx, storeId, dto.name, dto.commission) : dto.tableId!;
          const created = await tx.affiliate.create({
            data: { storeId, name: dto.name, email: dto.email, phone: dto.phone, cpf: dto.cpf, note: dto.note ?? null, tableId, invite: { create: invite.columns }, ...(document ? { document: { create: document } } : {}) },
            select: { id: true },
          });
          if (dto.commission) await tx.commissionTable.update({ where: { id: tableId }, data: { affiliateId: created.id } });
          return tx.affiliate.findUniqueOrThrow({ where: { id: created.id }, include: affiliateInclude });
        }),
      async () => {
        if (await takenBy(this.prisma, storeId, { cpf: dto.cpf }, null)) throw cpfTaken();
        if (await takenBy(this.prisma, storeId, { email: dto.email }, null)) throw emailTaken();
      },
    );

    await sendInvite(this.prisma, this.mail, storeId, row, invite.token);
    return toShopAffiliate(row);
  }

  /**
   * The table — a shared one, or their own commission, made or its rates replaced — and the phone,
   * the CPF and the note. Leaving their own table for a shared one deletes it: nobody else may be on
   * it, and an order keeps the rate it was placed at. Another table applies to orders from then on.
   */
  async update(storeSlug: string, userId: string, affiliateId: string, dto: UpdateAffiliateDto): Promise<ShopAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await affiliateOf(this.prisma, storeId, affiliateId);
    if (dto.tableId !== undefined && dto.commission !== undefined) throw eitherTableOrCommission();
    if (dto.tableId !== undefined) await tableFor(this.prisma, storeId, dto.tableId, current.id);
    if (dto.commission) await checkOwnCommission(this.prisma, storeId, dto.commission);
    const ownId = current.table.affiliateId === current.id ? current.tableId : null;

    const row = await this.withNameRetry(
      () =>
        this.prisma.$transaction(async (tx) => {
          let tableId = dto.tableId ?? current.tableId;
          if (dto.commission && ownId) await replaceOwnRates(tx, ownId, dto.commission);
          if (dto.commission && !ownId) {
            tableId = await createOwnTable(tx, storeId, current.name, dto.commission);
            await tx.commissionTable.update({ where: { id: tableId }, data: { affiliateId: current.id } });
          }
          if (dto.commission && ownId) tableId = ownId;

          await tx.affiliate.update({
            where: { id: current.id },
            data: {
              ...(tableId !== current.tableId ? { tableId } : {}),
              ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
              ...(dto.cpf !== undefined ? { cpf: dto.cpf } : {}),
              ...(dto.note !== undefined ? { note: dto.note } : {}),
            },
          });
          if (ownId && tableId !== ownId) await tx.commissionTable.delete({ where: { id: ownId } });
          return tx.affiliate.findUniqueOrThrow({ where: { id: current.id }, include: affiliateInclude });
        }),
      async () => {
        if (dto.cpf !== undefined && (await takenBy(this.prisma, storeId, { cpf: dto.cpf }, current.id))) throw cpfTaken();
      },
    );
    return toShopAffiliate(row);
  }

  /**
   * Runs the write; on a unique key broken, asks `explain` which one the person caused — a CPF, an
   * e-mail — and otherwise counts it as two own tables named alike at once, and tries again.
   */
  private async withNameRetry<T>(write: () => Promise<T>, explain: () => Promise<void>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await write();
      } catch (error) {
        if (isUniqueViolation(error)) {
          await explain();
          if (attempt < NAME_ATTEMPTS) continue;
        }
        // The table went in between: it was this shop's when read.
        if (isForeignKeyViolation(error)) throw tableMissing();
        throw error;
      }
    }
  }
}
