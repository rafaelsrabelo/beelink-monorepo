// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';

// Types
import type { CustomerCheckoutPhoneAnswer, CustomerPurchase } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { SAVED_ADDRESS_ORDER } from './customer-addresses.js';
import { Buyers, PURCHASE_SESSION_TTL_SECONDS, type Buyer } from './buyers.service.js';
import { CustomersService } from './customers.service.js';
import { purchaseAddressOf } from './purchase-address.js';

/**
 * A WhatsApp the shop knows, going on without a code (plan 2026-11-06--whatsapp-primeiro). Recognising
 * the number is not opening the account: it opens a purchase session on the shop's record of it, which
 * reads that record's addresses masked and nothing else of the person — no name, e-mail, CPF, history
 * or cashback — and places this purchase on it, as the panel does with a sale over WhatsApp.
 *
 * It says whether a number is the shop's customer, as the e-mail's door does: the price of a returning
 * customer not being stopped. The account door's limit by address slows a script.
 */
@Injectable()
export class CustomerPurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly buyers: Buyers,
  ) {}

  async byPhone(storeSlug: string, phone: string): Promise<CustomerCheckoutPhoneAnswer> {
    const { storeId } = await this.customers.scopeOf(storeSlug);
    const record = await this.prisma.customer.findUnique({ where: { storeId_phone: { storeId, phone } }, select: { id: true } });
    if (!record) return { kind: 'NEW' };
    return { kind: 'RECOGNIZED', purchase: await this.buyers.open(storeId, record.id) };
  }

  /** What a purchase session reads of its record: the addresses to deliver to, masked. The account has its own door to its record. */
  async read(storeSlug: string, buyer: Buyer): Promise<CustomerPurchase> {
    if (buyer.kind !== 'purchase') throw new UnauthorizedException({ errorCode: 'AUTH_UNAUTHENTICATED', message: 'Only a purchase session reads this' });
    const { customerId } = await this.buyers.at(storeSlug, buyer);
    const addresses = await this.prisma.customerAddress.findMany({
      where: { customerId, street: { not: null }, city: { not: null } },
      orderBy: SAVED_ADDRESS_ORDER,
      select: { id: true, street: true, number: true, city: true, state: true, isDefault: true },
    });
    return { addresses: addresses.map(purchaseAddressOf), expiresAt: new Date(Date.now() + PURCHASE_SESSION_TTL_SECONDS * 1000).toISOString() };
  }
}
