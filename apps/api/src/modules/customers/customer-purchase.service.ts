// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';

// Types
import type { CustomerPurchase } from '@harness-monorepo/contracts';
import type { PurchaseSessionModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { Buyers, type Buyer } from './buyers.service.js';
import type { PurchaseAddressDto } from './dto/customer-checkout.dto.js';

/** The visitor's own words back: what they typed, and the address once they gave it. */
function toPurchase(row: PurchaseSessionModel): CustomerPurchase {
  const address = row.street && row.city ? { zipCode: row.zipCode, street: row.street, number: row.number, complement: row.complement, neighborhood: row.neighborhood, city: row.city, state: row.state } : null;
  return { name: row.name, email: row.email, phone: row.phone, address, expiresAt: row.expiresAt.toISOString() };
}

/**
 * A visitor's purchase session, as the visitor reaches it (plan 2026-11-06--P0-checkout-sem-codigo):
 * reading back what they typed, giving the address their order goes to, and ending it. The address lives
 * on the session — never on a record of the shop, whose own addresses the session neither reads nor writes.
 */
@Injectable()
export class CustomerPurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buyers: Buyers,
  ) {}

  async read(storeSlug: string, buyer: Buyer): Promise<CustomerPurchase> {
    return toPurchase(await this.sessionOf(storeSlug, buyer));
  }

  async saveAddress(storeSlug: string, buyer: Buyer, dto: PurchaseAddressDto): Promise<CustomerPurchase> {
    const session = await this.sessionOf(storeSlug, buyer);
    const row = await this.prisma.purchaseSession.update({
      where: { id: session.id },
      data: { zipCode: dto.zipCode, street: dto.street, number: dto.number ?? null, complement: dto.complement ?? null, neighborhood: dto.neighborhood ?? null, city: dto.city, state: dto.state },
    });
    return toPurchase(row);
  }

  async end(storeSlug: string, buyer: Buyer): Promise<void> {
    await this.buyers.end((await this.sessionOf(storeSlug, buyer)).id);
  }

  /** The account has its own doors to itself; these are a visitor's. */
  private async sessionOf(storeSlug: string, buyer: Buyer): Promise<PurchaseSessionModel> {
    const { purchase } = await this.buyers.at(storeSlug, buyer);
    if (!purchase) throw new UnauthorizedException({ errorCode: 'AUTH_UNAUTHENTICATED', message: "Only a visitor's purchase session reads this" });
    return purchase;
  }
}
