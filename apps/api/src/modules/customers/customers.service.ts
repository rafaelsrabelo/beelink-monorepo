// Nest
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';

// Types
import type { AuthSession, CustomerProfile } from '@harness-monorepo/contracts';
import type { CustomerModel, UserModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { AccountScope } from '../auth/account-scope.js';
import { AuthService } from '../auth/auth.service.js';
import type { LoginDto, RegisterDto } from '../auth/dto/auth.dto.js';
import { SessionService } from '../auth/session.service.js';
import { StoresService } from '../stores/stores.service.js';
import type { UpdateCustomerProfileDto } from './dto/customer.dto.js';

function toCustomerProfile(customer: CustomerModel, email: string): CustomerProfile {
  return {
    id: customer.id,
    name: customer.name,
    email,
    phone: customer.phone,
    address: {
      zipCode: customer.zipCode,
      street: customer.street,
      number: customer.number,
      complement: customer.complement,
      neighborhood: customer.neighborhood,
      city: customer.city,
      state: customer.state,
    },
  } satisfies CustomerProfile;
}

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
  async register(storeSlug: string, dto: RegisterDto): Promise<void> {
    const scope = await this.scopeOf(storeSlug);

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

  async resendVerification(storeSlug: string, email: string): Promise<void> {
    await this.auth.resendVerification(email, await this.scopeOf(storeSlug));
  }

  /** The link comes back to this shop, and replaces the password of this shop's account only. */
  async forgotPassword(storeSlug: string, email: string): Promise<void> {
    await this.auth.forgotPassword(email, await this.scopeOf(storeSlug));
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

    return toCustomerProfile(await this.recordOf(storeId, user), user.email);
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
          ...dto.address,
        },
      });
      return toCustomerProfile(updated, user.email);
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

  /** This shop's accounts, and where their e-mailed links lead: 404 for a shop that does not exist. */
  private async scopeOf(storeSlug: string): Promise<AccountScope & { storeId: string }> {
    return { storeId: await this.stores.publicStoreId(storeSlug), continuePath: `/${storeSlug}` };
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
