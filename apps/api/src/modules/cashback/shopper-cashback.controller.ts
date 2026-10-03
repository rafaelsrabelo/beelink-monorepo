// Nest
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { ShopperCashback } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { CashbackService } from './cashback.service.js';
import { CustomerCashbackQueryDto } from './dto/cashback.dto.js';
import { ShopperCashbackResponse } from './dto/cashback.response.js';

/**
 * The signed-in shopper's own credit at a shop (BEELINK-244). `@Public()` to the global guard, which
 * refuses a shopper's token by design, and closed by `CustomerAuthGuard`, which refuses a shopkeeper's.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/cashback')
export class ShopperCashbackController {
  constructor(private readonly cashback: CashbackService) {}

  @Get()
  @ApiOperation({ summary: "The shopper's balance, what is pending, the lots still worth something and one page of the statement" })
  @ApiOkResponse({ type: ShopperCashbackResponse })
  @ApiBadRequestResponse({ description: 'BAD_REQUEST — a page out of bounds' })
  get(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer, @Query() query: CustomerCashbackQueryDto): Promise<ShopperCashback> {
    return this.cashback.mine(storeSlug, customer.userId, query);
  }
}
