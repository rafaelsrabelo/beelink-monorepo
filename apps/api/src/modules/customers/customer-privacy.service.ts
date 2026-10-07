// Nest
import { ForbiddenException, Injectable } from '@nestjs/common';

// Libs
import { verify } from '@node-rs/argon2';

// Types
import type { CustomerDataAccount, CustomerDataExport, CustomerDataOrderOrigin } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { UserModel } from '../../generated/prisma/models.js';

// App
import { forfeitCashback } from '../cashback/cashback-orders.js';
import { creditsOf, entriesOf } from '../cashback/cashback-reads.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { toCustomerConversation } from '../conversations/conversations.mapper.js';
import { favoriteInclude, toCustomerFavorite } from '../favorites/favorite-reading.js';
import { CUSTOMER_ORDER_INCLUDE, toCustomerOrder } from '../orders/customer-order.mapper.js';
import { RealtimePublisher } from '../realtime/realtime-publisher.js';
import { reviewInclude, toCustomerReview } from '../reviews/reviews.mapper.js';
import { lockCustomer } from './customer-lock.js';
import { toCustomerProfile } from './customer-profile.mapper.js';
import { CustomersService } from './customers.service.js';
import type { DeleteCustomerAccountDto } from './dto/customer-privacy.dto.js';

/** What a record kept for the shop's books loses with its account: all it knew of the person beyond a name and a phone. */
const FORGOTTEN = {
  userId: null,
  cpf: null,
  birthDate: null,
  claimedPhone: null,
  notifyOrders: true,
  notifyFavorites: true,
  notifyCashback: true,
  notifyOffers: false,
  notifyOffersAt: null,
} as const;

/**
 * A shopper's own data at a shop (BEELINK-152): a copy of all of it, and the end of their account.
 * What the account was at this shop ends with it; the orders are the shop's books and stay, with the
 * name and the address each one recorded when it was placed.
 */
@Injectable()
export class CustomerPrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly realtime: RealtimePublisher,
  ) {}

  /** Every order and conversation, never a page: the file is the whole of it. */
  async exportOf(storeSlug: string, userId: string): Promise<CustomerDataExport> {
    const { storeId, shopName, user, record } = await this.customers.shopperRecordAt(storeSlug, userId);
    const customerId = record.id;

    const [account, addresses, orders, favorites, reviews, talked, credits, entries, origins] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { identities: { select: { provider: true } }, legalAcceptances: { orderBy: { acceptedAt: 'asc' } } },
      }),
      this.customers.addressesOf(customerId),
      this.prisma.order.findMany({ where: { storeId, customerId }, orderBy: [{ placedAt: 'desc' }, { number: 'desc' }], include: CUSTOMER_ORDER_INCLUDE }),
      this.prisma.customerFavorite.findMany({ where: { customerId }, orderBy: { likedAt: 'desc' }, include: favoriteInclude }),
      this.prisma.productReview.findMany({ where: { customerId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: reviewInclude }),
      this.prisma.order.findMany({
        where: { storeId, customerId, conversation: { isNot: null } },
        orderBy: [{ placedAt: 'desc' }, { number: 'desc' }],
        select: { number: true, status: true, fulfillment: true, conversation: { select: { messages: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } } } },
      }),
      creditsOf(this.prisma, customerId, new Date()),
      entriesOf(this.prisma, customerId),
      // Only the orders that recorded something of the visit they came from (BEELINK-275).
      this.prisma.order.findMany({
        where: { storeId, customerId, OR: [{ utmSource: { not: null } }, { utmMedium: { not: null } }, { utmCampaign: { not: null } }, { marketingConsent: { isNot: null } }] },
        orderBy: [{ placedAt: 'desc' }, { number: 'desc' }],
        select: { number: true, utmSource: true, utmMedium: true, utmCampaign: true, utmContent: true, utmTerm: true, originAt: true, marketingConsent: true },
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      shop: { name: shopName, slug: storeSlug },
      account: {
        name: account.name,
        email: account.email,
        emailVerifiedAt: account.emailVerifiedAt?.toISOString() ?? null,
        createdAt: account.createdAt.toISOString(),
        signInWith: [...(account.passwordHash ? (['PASSWORD'] as const) : []), ...(account.identities.length > 0 ? (['GOOGLE'] as const) : [])],
        termsAccepted: account.legalAcceptances.map((row) => ({ version: row.version, via: row.via, acceptedAt: row.acceptedAt.toISOString() })),
      } satisfies CustomerDataAccount,
      profile: toCustomerProfile(record, user, addresses),
      record: { createdAt: record.createdAt.toISOString(), claimedPhone: record.claimedPhone },
      orders: orders.map(toCustomerOrder),
      orderOrigins: origins.map(
        (order) =>
          ({
            orderNumber: order.number,
            source: order.utmSource,
            medium: order.utmMedium,
            campaign: order.utmCampaign,
            content: order.utmContent,
            term: order.utmTerm,
            arrivedAt: order.originAt?.toISOString() ?? null,
            marketingConsent: order.marketingConsent && {
              fbclid: order.marketingConsent.fbclid,
              clickedAt: order.marketingConsent.clickedAt?.toISOString() ?? null,
              fbp: order.marketingConsent.fbp,
              userAgent: order.marketingConsent.userAgent,
              pageUrl: order.marketingConsent.pageUrl,
              recordedAt: order.marketingConsent.createdAt.toISOString(),
            },
          }) satisfies CustomerDataOrderOrigin,
      ),
      favorites: favorites.map(toCustomerFavorite),
      reviews: reviews.map(toCustomerReview),
      conversations: talked.map((order) => toCustomerConversation(order, order.conversation?.messages ?? [])),
      cashback: { balanceCents: credits.balanceCents, pendingCents: credits.pendingCents, credits: credits.credits, entries },
    } satisfies CustomerDataExport;
  }

  /**
   * The account ends, confirmed by its password — or, with none, its e-mail typed again. Its
   * sessions, tokens, Google ties and accepted terms go with it, by their cascades, and so does
   * everything the shopper kept here for themselves. A record the shop's books name — an order, a
   * review — stays the shop's, forgotten down to its name and phone; one they do not is deleted.
   */
  async deleteAccount(storeSlug: string, userId: string, dto: DeleteCustomerAccountDto): Promise<void> {
    const { storeId, user } = await this.customers.shopperRecordAt(storeSlug, userId);
    await this.confirm(user, dto);

    const ended = await this.prisma.$transaction(async (tx) => {
      // The shop's lock first, as placing an order and merging two records take it: an order placed
      // meanwhile would hold a key-share on the record that its delete — or its account's unlinking —
      // waits on, while the order's own books wait on this record's lock. One after the other instead.
      await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;
      // Read again under it: a merge in the panel may have folded the record into another since.
      const record = await tx.customer.findUnique({ where: { storeId_userId: { storeId, userId: user.id } }, select: { id: true } });
      if (record) await this.forget(tx, storeId, record.id);

      const sessions = await tx.session.findMany({ where: { userId: user.id }, select: { id: true } });
      await tx.user.delete({ where: { id: user.id } });
      return sessions.map((session) => session.id);
    });

    // The guard reads the session on every request, so the token stops opening anything now; a
    // socket's ticket was read once, at the door, and the socket has to be closed.
    this.realtime.endSessions(ended);
  }

  /**
   * What the shopper kept for themselves goes. A record the shop's books name — an order, a review, a cashback statement —
   * stays, down to a name and a phone; one they do not is deleted, with its cascades. Favourites
   * before their notices: a watch writing a notice holds its favourite's row, so waiting on that row
   * lets the notice land first and go with the rest.
   */
  private async forget(tx: Prisma.TransactionClient, storeId: string, customerId: string): Promise<void> {
    await lockCustomer(tx, customerId);
    // Their credit goes with the account (BEELINK-239), told by a line of the shop's statement.
    await forfeitCashback(tx, storeId, customerId, new Date());
    const orders = await tx.order.count({ where: { customerId } });
    const reviews = await tx.productReview.count({ where: { customerId } });
    // The shop's statement of what it gave them (BEELINK-238) is its books too, and its adjustments name who made them.
    const cashback = await tx.cashbackEntry.count({ where: { customerId } });

    // What an order kept of their browser with their yes to the shop's pixel (BEELINK-275) is theirs, not
    // the books': the orders stay, with the campaign they came by, and these identifiers go.
    await tx.orderMarketingConsent.deleteMany({ where: { order: { customerId } } });
    await tx.customerFavorite.deleteMany({ where: { customerId } });
    await tx.favoriteNotice.deleteMany({ where: { customerId } });
    if (orders > 0 || reviews > 0 || cashback > 0) {
      // The orders keep where each one went; the saved addresses were the shopper's, not the books'.
      await tx.customerAddress.deleteMany({ where: { customerId } });
      await tx.customer.update({ where: { id: customerId }, data: FORGOTTEN });
    } else {
      await tx.customer.delete({ where: { id: customerId } });
    }
  }

  /** The same 403 as a password change for a wrong password; an e-mail that is not the account's has its own. */
  private async confirm(user: UserModel, dto: DeleteCustomerAccountDto): Promise<void> {
    if (user.passwordHash) {
      if (!dto.password || !(await verify(user.passwordHash, dto.password))) {
        throw new ForbiddenException({ errorCode: 'AUTH_PASSWORD_WRONG', message: 'The password does not match' });
      }
      return;
    }
    if ((dto.email ?? '').trim().toLowerCase() !== user.email) {
      throw new ForbiddenException({ errorCode: 'CUSTOMER_DELETE_EMAIL_MISMATCH', message: "That is not this account's e-mail" });
    }
  }
}
