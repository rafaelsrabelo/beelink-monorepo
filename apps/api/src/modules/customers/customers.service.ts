// Nest
import { ConflictException, Injectable } from '@nestjs/common';

// Types
import type { AuthSession, CustomerProfile } from '@harness-monorepo/contracts';
import type { CustomerModel, UserModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
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
 * The shopper's door: the same accounts as the panel's, reached from a shop, with sessions of their
 * own and a customer record per shop. Nothing here reads or changes a store; the shop's slug only
 * says which shop's record to use and where the verification link should bring the person back.
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
    await this.stores.publicStoreId(storeSlug);

    try {
      await this.auth.register(dto, `/${storeSlug}`);
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      await this.auth.resendVerification(dto.email, `/${storeSlug}`);
    }
  }

  async resendVerification(storeSlug: string, email: string): Promise<void> {
    await this.stores.publicStoreId(storeSlug);
    await this.auth.resendVerification(email, `/${storeSlug}`);
  }

  /** A shopper's session at this shop; the shop's record of them is made the first time. */
  async login(storeSlug: string, dto: LoginDto, userAgent?: string): Promise<AuthSession> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const user = await this.auth.verifiedUser(dto);

    await this.recordOf(storeId, user);

    return this.sessions.start(user, userAgent, 'CUSTOMER');
  }

  async me(storeSlug: string, userId: string): Promise<CustomerProfile> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return toCustomerProfile(await this.recordOf(storeId, user), user.email);
  }

  async update(storeSlug: string, userId: string, dto: UpdateCustomerProfileDto): Promise<CustomerProfile> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const record = await this.recordOf(storeId, user);

    try {
      const updated = await this.prisma.customer.update({
        where: { id: record.id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...dto.address,
        },
      });
      return toCustomerProfile(updated, user.email);
    } catch (error) {
      // The phone identifies a customer within a shop. Two records of one shop cannot share it.
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException({ errorCode: 'CUSTOMER_PHONE_TAKEN', message: 'That phone belongs to another customer of this shop' });
      }
      throw error;
    }
  }

  /** The shop's record of this account, made on first use with the account's name. */
  private recordOf(storeId: string, user: Pick<UserModel, 'id' | 'name'>): Promise<CustomerModel> {
    return this.prisma.customer.upsert({
      where: { storeId_userId: { storeId, userId: user.id } },
      create: { storeId, userId: user.id, name: user.name },
      update: {},
    });
  }
}
