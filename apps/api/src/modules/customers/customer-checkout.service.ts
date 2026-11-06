// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { CustomerCheckoutAnswer } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { Buyers } from './buyers.service.js';
import { CustomersService } from './customers.service.js';
import type { CustomerCheckoutDto } from './dto/customer-checkout.dto.js';

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'P2002';
}

/**
 * A visitor's checkout (plan 2026-11-06--P0-checkout-sem-codigo): a name, an e-mail and a WhatsApp open a
 * purchase session, and the purchase goes on — no code, no password, no account, whatever the e-mail.
 * Having someone's e-mail is no proof of being them, so the e-mail is never looked up: it is kept for the
 * order, as typed. The answer is the same for every input, and says nothing of who is a customer.
 *
 * The order goes on the shop's record of the phone — the panel's own rule, a sale over WhatsApp registered
 * by the number (docs/product: the phone identifies a customer within a shop) — or on a new record, named
 * as typed. Nothing of that record reaches the visitor: the session reads only what they typed.
 */
@Injectable()
export class CustomerCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly buyers: Buyers,
  ) {}

  async identify(storeSlug: string, dto: CustomerCheckoutDto): Promise<CustomerCheckoutAnswer> {
    const { storeId } = await this.customers.scopeOf(storeSlug);
    const customerId = await this.recordOf(storeId, dto.name, dto.phone);
    return { purchase: await this.buyers.open(storeId, customerId, { name: dto.name, email: dto.email, phone: dto.phone }) };
  }

  /** The record of the phone at this shop, else a new one with the name typed — never renamed or otherwise touched. */
  private async recordOf(storeId: string, name: string, phone: string): Promise<string> {
    const where = { storeId_phone: { storeId, phone } };
    const known = await this.prisma.customer.findUnique({ where, select: { id: true } });
    if (known) return known.id;
    try {
      return (await this.prisma.customer.create({ data: { storeId, name, phone }, select: { id: true } })).id;
    } catch (error) {
      // Made between the read and the insert — the same visitor pressing twice, most likely.
      if (!isUniqueViolation(error)) throw error;
      return (await this.prisma.customer.findUniqueOrThrow({ where, select: { id: true } })).id;
    }
  }
}
