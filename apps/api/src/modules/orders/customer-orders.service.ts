// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { CustomerOrder } from '@harness-monorepo/contracts';

// App
import { CustomersService } from '../customers/customers.service.js';
import type { PlaceCustomerOrderDto } from './dto/customer-order.dto.js';
import { OrderPlacement } from './order-placement.js';
import { toCustomerOrder } from './orders.mapper.js';

/** The signed-in shopper's own orders at a shop, starting with placing one from the cart. */
@Injectable()
export class CustomerOrdersService {
  constructor(
    private readonly customers: CustomersService,
    private readonly placement: OrderPlacement,
  ) {}

  /**
   * The cart as an order of the shopper's record at this shop: priced, checked against the stock and
   * the shop's payments, and waiting for the shop — `RECEIVED`, the shopper's own word on it. The fee
   * is the shop's to tell, until the product computes one.
   */
  async place(storeSlug: string, userId: string, dto: PlaceCustomerOrderDto): Promise<CustomerOrder> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);

    const order = await this.placement.place({
      storeId,
      items: dto.items,
      fulfillment: dto.fulfillment,
      paymentMethod: dto.paymentMethod,
      deliveryFeeCents: 0,
      discountCents: 0,
      note: null,
      placedAt: new Date(),
      status: 'RECEIVED',
      actor: 'CUSTOMER',
      userId,
      customerOf: async () => customerId,
    });
    return toCustomerOrder(order);
  }
}
