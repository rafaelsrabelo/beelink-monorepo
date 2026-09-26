// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { ContactField, Lead, LeadListQuery, LeadPage } from '@harness-monorepo/contracts';
import type { CreateLeadDto, UpdateLeadDto } from './dto/lead.dto.js';

// App
import { MailService } from '../../shared/mail/mail.service.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { parseComponentItems } from '../page/component-items.schema.js';
import { StoresService } from '../stores/stores.service.js';
import { checkAnswers, leadError } from './lead-answers.js';
import { LEADS_PAGE_SIZE, LEADS_PAGE_SIZE_MAX } from './leads.constants.js';
import { toLead } from './leads.mapper.js';

/**
 * What arrives through a site's contact form, and how its owner works through it.
 *
 * One service for the two sides — the anonymous write and the owner's reads — because the row is
 * one thing. The two controllers are what keep the guards apart.
 */
@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly mail: MailService,
  ) {}

  /**
   * A visitor's submission. Anonymous, and answered with nothing: the form only needs yes or no.
   *
   * The answers are checked against the form the body names — which has to be this site's, a
   * contact form, and shown — so a body cannot post to a form its owner hid, and cannot invent
   * fields. The row is written first and the owner's e-mail goes second, not awaited: a person
   * who just pressed "Enviar" is answered as soon as the lead exists, and a mail server that is
   * slow or down is a log line in `MailService`, never a 500 and never a lost lead.
   */
  async receive(storeSlug: string, dto: CreateLeadDto): Promise<void> {
    const storeId = await this.stores.publicStoreId(storeSlug);

    // The trap, sprung: a field no person sees was filled in. Answered exactly like a save, and
    // nothing is written or sent — a robot shown success does not come back with a variation.
    if (dto.website) return;

    // On a page that is served: a form on a draft landing is one no visitor was shown.
    const form = await this.prisma.storeComponent.findFirst({
      where: {
        id: dto.componentId,
        storeId,
        kind: 'CONTACT',
        isActive: true,
        section: { isActive: true, page: { status: 'PUBLISHED' } },
      },
      select: {
        id: true,
        items: true,
        store: { select: { slug: true, name: true, owner: { select: { name: true, email: true } } } },
      },
    });

    if (!form) throw new NotFoundException(leadError('LEAD_FORM_NOT_FOUND', 'Este site não tem esse formulário'));

    const fields = parseComponentItems('CONTACT', form.items) as ContactField[];
    const checked = checkAnswers(fields, dto.answers);

    const row = await this.prisma.lead.create({
      data: {
        storeId,
        componentId: form.id,
        name: dto.name,
        email: checked.email,
        phone: checked.phone,
        answers: checked.answers,
      },
    });

    void this.mail.sendLeadReceived(form.store.owner.email, {
      ownerName: form.store.owner.name,
      siteName: form.store.name,
      siteSlug: form.store.slug,
      lead: toLead(row),
    });
  }

  /** The owner's list, newest first. The bounds used are echoed, never the ones asked for. */
  async list(storeSlug: string, userId: string, query: LeadListQuery = {}): Promise<LeadPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? LEADS_PAGE_SIZE, 1), LEADS_PAGE_SIZE_MAX);
    const where = { storeId, ...(query.status ? { status: query.status } : {}) };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads: rows.map(toLead), total, page, pageSize };
  }

  async updateStatus(storeSlug: string, userId: string, leadId: string, dto: UpdateLeadDto): Promise<Lead> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.owned(storeId, leadId);

    const row = await this.prisma.lead.update({ where: { id: leadId }, data: { status: dto.status } });

    return toLead(row);
  }

  /** Gone for good. A person may ask to be forgotten, and the owner needs a way to do it. */
  async remove(storeSlug: string, userId: string, leadId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.owned(storeId, leadId);

    await this.prisma.lead.delete({ where: { id: leadId } });
  }

  /** A lead that exists but belongs to another site answers 404: this site does not have one. */
  private async owned(storeId: string, leadId: string): Promise<void> {
    const row = await this.prisma.lead.findUnique({ where: { id: leadId }, select: { storeId: true } });

    if (!row || row.storeId !== storeId) {
      throw new NotFoundException(leadError('LEAD_NOT_FOUND', `No lead ${leadId} on this site`));
    }
  }
}
