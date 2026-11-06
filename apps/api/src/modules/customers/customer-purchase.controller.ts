// Nest
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { CustomerPurchase } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import type { Buyer } from './buyers.service.js';
import { CustomerAuthGuard } from './customer-auth.guard.js';
import { CustomerPurchaseService } from './customer-purchase.service.js';
import { CurrentBuyer, OpenToPurchase } from './customer.decorators.js';
import { CustomerPurchaseResponse } from './dto/customer-checkout.dto.js';

/**
 * What a purchase session reads of the record it was opened on (plan 2026-11-06--whatsapp-primeiro):
 * the addresses to deliver to, masked. Closed to a page locked for want of payment, as the checkout is.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED — no purchase session, or one of another shop' })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/purchase')
export class CustomerPurchaseController {
  constructor(private readonly purchases: CustomerPurchaseService) {}

  @Get()
  @OpenToPurchase()
  @ApiOperation({ summary: "The purchase session's record: its addresses, masked, and when the session ends" })
  @ApiOkResponse({ type: CustomerPurchaseResponse })
  read(@Param('storeSlug') storeSlug: string, @CurrentBuyer() buyer: Buyer): Promise<CustomerPurchase> {
    return this.purchases.read(storeSlug, buyer);
  }
}
