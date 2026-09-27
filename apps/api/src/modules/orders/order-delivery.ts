// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { OrderDeliveryAddress, OrderFulfillment } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { orderError } from './orders.constants.js';

type Tx = Prisma.TransactionClient;

/** Where an order goes, as the order's own columns hold it. */
export interface DeliveryColumns {
  deliveryName: string | null;
  deliveryZipCode: string | null;
  deliveryStreet: string | null;
  deliveryNumber: string | null;
  deliveryComplement: string | null;
  deliveryNeighborhood: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
}

/** The part of a customer's record a delivery reads. */
export interface CustomerAddressRow {
  name: string;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

const PICKUP: DeliveryColumns = {
  deliveryName: null,
  deliveryZipCode: null,
  deliveryStreet: null,
  deliveryNumber: null,
  deliveryComplement: null,
  deliveryNeighborhood: null,
  deliveryCity: null,
  deliveryState: null,
};

/** A part saved as spaces was never filled in. */
function filled(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * The customer's record as it is now, photographed as the order's delivery — or null when it has
 * no street and city, which is nowhere to deliver. The shop window already reads an address that
 * way (`isReachable`): demanding a number or a neighbourhood would refuse customers a shop serves.
 */
export function deliveryColumnsOf(customer: CustomerAddressRow): DeliveryColumns | null {
  const street = filled(customer.street);
  const city = filled(customer.city);
  if (!street || !city) return null;

  return {
    deliveryName: customer.name,
    deliveryZipCode: filled(customer.zipCode),
    deliveryStreet: street,
    deliveryNumber: filled(customer.number),
    deliveryComplement: filled(customer.complement),
    deliveryNeighborhood: filled(customer.neighborhood),
    deliveryCity: city,
    deliveryState: filled(customer.state),
  };
}

/**
 * The delivery columns of an order being placed, inside its transaction: none on a pick-up, the
 * customer's address on a delivery. A delivery with nowhere to go throws, and the transaction takes
 * the order's number, its stock and a customer registered with it back along with it.
 */
export async function deliveryOf(tx: Tx, customerId: string, fulfillment: OrderFulfillment): Promise<DeliveryColumns> {
  if (fulfillment === 'PICKUP') return PICKUP;

  const customer = await tx.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { name: true, zipCode: true, street: true, number: true, complement: true, neighborhood: true, city: true, state: true },
  });
  const columns = deliveryColumnsOf(customer);
  if (!columns) {
    throw new BadRequestException(orderError('ORDER_DELIVERY_ADDRESS_MISSING', 'The customer has no street and city to deliver to'));
  }
  return columns;
}

/** The columns back as the wire's address; null when they were never written. */
export function toDeliveryAddress(row: DeliveryColumns): OrderDeliveryAddress | null {
  if (!row.deliveryName || !row.deliveryStreet || !row.deliveryCity) return null;

  return {
    recipientName: row.deliveryName,
    zipCode: row.deliveryZipCode,
    street: row.deliveryStreet,
    number: row.deliveryNumber,
    complement: row.deliveryComplement,
    neighborhood: row.deliveryNeighborhood,
    city: row.deliveryCity,
    state: row.deliveryState,
  };
}
