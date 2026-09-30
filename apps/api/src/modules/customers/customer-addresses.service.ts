// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CustomerSavedAddress } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CustomerAddressModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ADDRESSES_MAX, SAVED_ADDRESS_ORDER, promoteDefault, toSavedAddress } from './customer-addresses.js';
import { lockCustomer } from './customer-lock.js';
import { CustomersService } from './customers.service.js';
import type { SaveCustomerAddressDto } from './dto/customer-address.dto.js';

type Tx = Prisma.TransactionClient;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The parts a save writes: the whole address, blank as null. */
function columnsOf(dto: SaveCustomerAddressDto): Omit<Prisma.CustomerAddressUncheckedCreateInput, 'customerId'> {
  return {
    label: dto.label ?? null,
    recipientName: dto.recipientName ?? null,
    zipCode: dto.zipCode,
    street: dto.street,
    number: dto.number ?? null,
    complement: dto.complement ?? null,
    neighborhood: dto.neighborhood ?? null,
    city: dto.city,
    state: dto.state,
  };
}

/**
 * The shopper's saved addresses at a shop (BEELINK-148). Every change runs under the lock of the
 * shopper's record, so the default stays exactly one while any address is left.
 */
@Injectable()
export class CustomerAddressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  async list(storeSlug: string, userId: string): Promise<CustomerSavedAddress[]> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);
    const rows = await this.prisma.customerAddress.findMany({ where: { customerId }, orderBy: SAVED_ADDRESS_ORDER });
    return rows.map(toSavedAddress);
  }

  /** A new address: the default when it is the first, or when asked to be. */
  async create(storeSlug: string, userId: string, dto: SaveCustomerAddressDto): Promise<CustomerSavedAddress> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);

    return this.prisma.$transaction(async (tx) => {
      await lockCustomer(tx, customerId);
      const count = await tx.customerAddress.count({ where: { customerId } });
      if (count >= ADDRESSES_MAX) {
        throw new ConflictException({ errorCode: 'CUSTOMER_ADDRESS_LIMIT', message: `A customer keeps at most ${ADDRESSES_MAX} addresses` });
      }

      const isDefault = count === 0 || dto.isDefault === true;
      if (isDefault) await tx.customerAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      return toSavedAddress(await tx.customerAddress.create({ data: { customerId, ...columnsOf(dto), isDefault } }));
    });
  }

  /** Every part replaced; the default moves here when asked, and never away from here by a save. */
  async replace(storeSlug: string, userId: string, addressId: string, dto: SaveCustomerAddressDto): Promise<CustomerSavedAddress> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);

    return this.prisma.$transaction(async (tx) => {
      const current = await this.ownedIn(tx, customerId, addressId);
      const becomesDefault = dto.isDefault === true && !current.isDefault;
      if (becomesDefault) await tx.customerAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      const row = await tx.customerAddress.update({
        where: { id: current.id },
        data: { ...columnsOf(dto), ...(becomesDefault ? { isDefault: true } : {}) },
      });
      return toSavedAddress(row);
    });
  }

  /** Gone; when it was the default, the address changed last takes its place. */
  async remove(storeSlug: string, userId: string, addressId: string): Promise<void> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);

    await this.prisma.$transaction(async (tx) => {
      const current = await this.ownedIn(tx, customerId, addressId);
      await tx.customerAddress.delete({ where: { id: current.id } });
      if (current.isDefault) await promoteDefault(tx, customerId);
    });
  }

  async makeDefault(storeSlug: string, userId: string, addressId: string): Promise<CustomerSavedAddress> {
    const { customerId } = await this.customers.shopperAt(storeSlug, userId);

    return this.prisma.$transaction(async (tx) => {
      const current = await this.ownedIn(tx, customerId, addressId);
      if (current.isDefault) return toSavedAddress(current);
      await tx.customerAddress.updateMany({ where: { customerId, isDefault: true }, data: { isDefault: false } });
      return toSavedAddress(await tx.customerAddress.update({ where: { id: current.id }, data: { isDefault: true } }));
    });
  }

  /**
   * One of this shopper's addresses, with their record locked. Another shopper's, another shop's or
   * one that is not an id at all is not found: the answer never tells an address exists elsewhere.
   */
  private async ownedIn(tx: Tx, customerId: string, addressId: string): Promise<CustomerAddressModel> {
    await lockCustomer(tx, customerId);
    const row = UUID.test(addressId) ? await tx.customerAddress.findFirst({ where: { id: addressId.toLowerCase(), customerId } }) : null;
    if (!row) throw new NotFoundException({ errorCode: 'CUSTOMER_ADDRESS_NOT_FOUND', message: 'No such address among this customer\'s' });
    return row;
  }
}
