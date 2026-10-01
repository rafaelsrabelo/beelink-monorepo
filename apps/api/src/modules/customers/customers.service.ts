// Nest
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';

// Types
import type { AuthSession, CustomerNotifications, CustomerProfile } from '@harness-monorepo/contracts';
import type { CustomerAddressModel, CustomerModel, UserModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { AccountScope, AccountShop } from '../auth/account-scope.js';
import { AuthService } from '../auth/auth.service.js';
import type { LoginDto } from '../auth/dto/auth.dto.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { SessionService } from '../auth/session.service.js';
import { StoresService } from '../stores/stores.service.js';
import { SAVED_ADDRESS_ORDER } from './customer-addresses.js';
import { toCustomerProfile, toNotifications } from './customer-profile.mapper.js';
import type { CustomerRegisterDto } from './dto/customer-link.dto.js';
import type { UpdateCustomerNotificationsDto } from './dto/customer-notifications.dto.js';
import type { UpdateCustomerProfileDto } from './dto/customer.dto.js';
import { shopReturnOf } from './shop-return.js';

/**
 * The shopper's door: accounts that belong to one shop, opened and signed in to there and nowhere
 * else, with sessions of their own and the shop's record of each. Nothing here reads or changes a
 * store; the slug says whose accounts these are and where an e-mailed link brings the person back.
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly stores: StoresService,
  ) {}

  /**
   * Opens an account from a shop, or says nothing about the one that exists. The panel's sign-up
   * answers "e-mail taken"; a shop window may not reveal who shops, so an address already in use
   * gets the same answer as a new one — and, if it was never verified, a fresh link.
   */
  async register(storeSlug: string, dto: CustomerRegisterDto): Promise<void> {
    const scope = await this.scopeOf(storeSlug, dto.returnTo);

    try {
      const user = await this.auth.register(dto, scope);
      // An account opened at a shop is that shop's customer from the start — a lead until it buys —
      // not only from its first sign-in. An address already in use gets no record: anyone can type
      // someone else's e-mail, and it would put that person on a shop's list they never joined.
      await this.recordOf(scope.storeId, user);
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      await this.auth.resendVerification(dto.email, scope);
    }
  }

  async resendVerification(storeSlug: string, email: string, returnTo?: string): Promise<void> {
    await this.auth.resendVerification(email, await this.scopeOf(storeSlug, returnTo));
  }

  /** The link comes back to this shop, and replaces the password of this shop's account only. */
  async forgotPassword(storeSlug: string, email: string, returnTo?: string): Promise<void> {
    await this.auth.forgotPassword(email, await this.scopeOf(storeSlug, returnTo));
  }

  /** A shopper's session at this shop; the shop's record of them is made the first time. */
  async login(storeSlug: string, dto: LoginDto, userAgent?: string): Promise<AuthSession> {
    const scope = await this.scopeOf(storeSlug);
    const user = await this.auth.verifiedUser(dto, scope);

    await this.recordOf(scope.storeId, user);

    return this.sessions.start(user, userAgent, 'CUSTOMER');
  }

  async refresh(storeSlug: string, refreshToken: string): Promise<AuthSession> {
    const { storeId } = await this.scopeOf(storeSlug);
    return this.sessions.refresh(refreshToken, 'CUSTOMER', storeId);
  }

  async me(storeSlug: string, userId: string): Promise<CustomerProfile> {
    const { storeId } = await this.scopeOf(storeSlug);
    const user = await this.accountAt(storeId, userId);

    const record = await this.recordOf(storeId, user);
    return toCustomerProfile(record, user, await this.addressesOf(record.id));
  }

  /**
   * The shop and the signed-in shopper's record in it — made on first use, as `me` makes it — for
   * what a shopper does at a shop beyond their details: placing an order.
   */
  async shopperAt(storeSlug: string, userId: string): Promise<{ storeId: string; customerId: string }> {
    const { storeId } = await this.scopeOf(storeSlug);
    const user = await this.accountAt(storeId, userId);
    return { storeId, customerId: (await this.recordOf(storeId, user)).id };
  }

  async update(storeSlug: string, userId: string, dto: UpdateCustomerProfileDto): Promise<CustomerProfile> {
    const { storeId } = await this.scopeOf(storeSlug);
    const user = await this.accountAt(storeId, userId);
    const record = await this.recordOf(storeId, user);

    try {
      const updated = await this.prisma.customer.update({
        where: { id: record.id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          // A phone that sticks settles any claim; clearing it leaves one standing.
          ...(dto.phone !== undefined ? { phone: dto.phone, ...(dto.phone !== null ? { claimedPhone: null } : {}) } : {}),
          ...(dto.cpf !== undefined ? { cpf: dto.cpf } : {}),
          // Midnight UTC is the day itself in a `DATE` column; see `dayOf`.
          ...(dto.birthDate !== undefined ? { birthDate: dto.birthDate === null ? null : new Date(`${dto.birthDate}T00:00:00.000Z`) } : {}),
        },
      });
      return toCustomerProfile(updated, user, await this.addressesOf(updated.id));
    } catch (error) {
      // The phone identifies a customer within a shop. Two records of one shop cannot share it.
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        // Most likely the shopkeeper registered this person before they had an account. Remembered,
        // so the panel can flag the pair — never merged from here: anyone can type another's phone.
        if (dto.phone) await this.prisma.customer.update({ where: { id: record.id }, data: { claimedPhone: dto.phone } });
        throw new ConflictException({ errorCode: 'CUSTOMER_PHONE_TAKEN', message: 'That phone belongs to another customer of this shop' });
      }
      throw error;
    }
  }

  /**
   * The shopper's notices by e-mail (BEELINK-151), all three at once. Saying yes or no to offers
   * keeps when it was said — the consent's date — and saving it again unchanged does not move it.
   */
  async updateNotifications(storeSlug: string, userId: string, dto: UpdateCustomerNotificationsDto): Promise<CustomerNotifications> {
    const { storeId } = await this.scopeOf(storeSlug);
    const record = await this.recordOf(storeId, await this.accountAt(storeId, userId));
    const updated = await this.prisma.customer.update({
      where: { id: record.id },
      data: {
        notifyOrders: dto.orders,
        notifyFavorites: dto.favorites,
        notifyOffers: dto.offers,
        ...(dto.offers !== record.notifyOffers ? { notifyOffersAt: new Date() } : {}),
      },
    });
    return toNotifications(updated);
  }

  /** The shopper's new password, given the current one; this session stays, the others end (BEELINK-150). */
  async changePassword(storeSlug: string, userId: string, sessionId: string, currentPassword: string, newPassword: string): Promise<void> {
    const { storeId } = await this.scopeOf(storeSlug);
    const user = await this.accountAt(storeId, userId);
    await this.auth.changePassword(user.id, currentPassword, newPassword, sessionId);
  }

  /**
   * The link that sets a password, to the shopper's own address — for an account opened through
   * Google, which has none to change. It is the new-password e-mail of the shop's own page (J10).
   */
  async sendPasswordLink(storeSlug: string, userId: string, returnTo?: string): Promise<void> {
    const scope = await this.scopeOf(storeSlug, returnTo);
    const user = await this.accountAt(scope.storeId, userId);
    await this.auth.forgotPassword(user.email, scope);
  }

  /** Every session of the shopper's account at this shop ends, this one too. */
  async signOutEverywhere(storeSlug: string, userId: string): Promise<void> {
    const { storeId } = await this.scopeOf(storeSlug);
    const user = await this.accountAt(storeId, userId);
    await this.sessions.revokeAllForUser(user.id);
  }

  /**
   * The shop, the signed-in shopper's account there and their record — made on first use, as `me`
   * makes it — for what reads or ends the whole of it (BEELINK-152).
   */
  async shopperRecordAt(storeSlug: string, userId: string): Promise<{ storeId: string; shopName: string; user: UserModel; record: CustomerModel }> {
    const scope = await this.scopeOf(storeSlug);
    const user = await this.accountAt(scope.storeId, userId);
    return { storeId: scope.storeId, shopName: scope.shop.name, user, record: await this.recordOf(scope.storeId, user) };
  }

  addressesOf(customerId: string): Promise<CustomerAddressModel[]> {
    return this.prisma.customerAddress.findMany({ where: { customerId }, orderBy: SAVED_ADDRESS_ORDER });
  }

  /**
   * This shop's accounts, and what their e-mails carry: the shop's name, its own pages for the links,
   * in its own route words, and where the shopper goes back to. 404 for a shop that does not exist.
   */
  private async scopeOf(storeSlug: string, returnTo?: string): Promise<AccountScope & { storeId: string; shop: AccountShop }> {
    const store = await this.stores.publicStoreNaming(storeSlug);
    const words = ROUTE_WORDS[store.routeVocabulary];
    return {
      storeId: store.id,
      shop: {
        name: store.name,
        verifyPath: `/${storeSlug}/${words.verifyEmail}`,
        resetPath: `/${storeSlug}/${words.resetPassword}`,
        returnTo: shopReturnOf(storeSlug, returnTo),
      },
    };
  }

  /**
   * The signed-in shopper's account, if it belongs to this shop. A token opened at another shop is
   * refused as if there were none: that shop's account is a stranger here.
   */
  private async accountAt(storeId: string, userId: string): Promise<UserModel> {
    const user = await this.prisma.user.findFirst({ where: { id: userId, storeId } });
    if (!user) throw new UnauthorizedException({ errorCode: 'AUTH_UNAUTHENTICATED', message: "This shopper's session belongs to another shop" });
    return user;
  }

  /**
   * The shop's record of this account, made on first use with the account's name — also by Google's
   * door. Prisma's upsert reads, then inserts: two first uses at once both insert, and the one that
   * loses reads the record the other made instead of failing.
   */
  async recordOf(storeId: string, user: Pick<UserModel, 'id' | 'name'>): Promise<CustomerModel> {
    const where = { storeId_userId: { storeId, userId: user.id } };

    try {
      return await this.prisma.customer.upsert({ where, create: { storeId, userId: user.id, name: user.name }, update: {} });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') return this.prisma.customer.findUniqueOrThrow({ where });
      throw error;
    }
  }
}
