// Types
import type { CustomerNotifications, CustomerProfile } from '@harness-monorepo/contracts';
import type { CustomerAddressModel, CustomerModel, UserModel } from '../../generated/prisma/models.js';

// App
import { dayOf } from '../../shared/http/birth-date.js';
import { addressPartsOf, toSavedAddress } from './customer-addresses.js';

export function toNotifications(customer: Pick<CustomerModel, 'notifyOrders' | 'notifyFavorites' | 'notifyCashback' | 'notifyOffers' | 'notifyOffersAt'>): CustomerNotifications {
  return {
    orders: customer.notifyOrders,
    favorites: customer.notifyFavorites,
    cashback: customer.notifyCashback,
    offers: customer.notifyOffers,
    offersChosenAt: customer.notifyOffersAt?.toISOString() ?? null,
  } satisfies CustomerNotifications;
}

/** The record, its account — e-mail, and whether it has a password — and its addresses as `SAVED_ADDRESS_ORDER` reads them: the default first. */
export function toCustomerProfile(customer: CustomerModel, user: Pick<UserModel, 'email' | 'passwordHash'>, addresses: CustomerAddressModel[]): CustomerProfile {
  return {
    id: customer.id,
    name: customer.name,
    email: user.email,
    phone: customer.phone,
    cpf: customer.cpf,
    birthDate: dayOf(customer.birthDate),
    address: addressPartsOf(addresses.find((address) => address.isDefault)),
    addresses: addresses.map(toSavedAddress),
    hasPassword: user.passwordHash !== null,
    notifications: toNotifications(customer),
    cashback: { balanceCents: customer.cashbackBalanceCents, pendingCents: customer.cashbackPendingCents },
  } satisfies CustomerProfile;
}
