// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { CustomerPurchase } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import type { Buyer } from './buyers.service.js';
import { CustomerAuthGuard } from './customer-auth.guard.js';
import { CustomerPurchaseService } from './customer-purchase.service.js';
import { CurrentBuyer, OpenToPurchase } from './customer.decorators.js';
import { CustomerPurchaseResponse, PurchaseAddressDto } from './dto/customer-checkout.dto.js';

/**
 * A visitor's purchase session, reached by the visitor (plan 2026-11-06--P0-checkout-sem-codigo): what
 * they typed, the address their order goes to, and its end. Closed to a page locked for want of payment.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED — no purchase session holds here' })
@Public()
@UseGuards(CustomerAuthGuard)
@OpenToPurchase()
@Controller('stores/:storeSlug/customer/purchase')
export class CustomerPurchaseController {
  constructor(private readonly purchases: CustomerPurchaseService) {}

  @Get()
  @ApiOperation({ summary: 'What the visitor typed at the checkout, and the address they gave' })
  @ApiOkResponse({ type: CustomerPurchaseResponse })
  read(@Param('storeSlug') storeSlug: string, @CurrentBuyer() buyer: Buyer): Promise<CustomerPurchase> {
    return this.purchases.read(storeSlug, buyer);
  }

  @Put('address')
  @ApiOperation({ summary: "Where the visitor's order goes: kept on the session, never on a record of the shop" })
  @ApiOkResponse({ type: CustomerPurchaseResponse })
  saveAddress(@Param('storeSlug') storeSlug: string, @CurrentBuyer() buyer: Buyer, @Body() dto: PurchaseAddressDto): Promise<CustomerPurchase> {
    return this.purchases.saveAddress(storeSlug, buyer, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'The visitor changing who is buying: the session stops holding at once' })
  @ApiNoContentResponse()
  async end(@Param('storeSlug') storeSlug: string, @CurrentBuyer() buyer: Buyer): Promise<void> {
    await this.purchases.end(storeSlug, buyer);
  }
}
