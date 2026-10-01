// Nest
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { CustomerCashback } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { CashbackService } from './cashback.service.js';
import { CashbackAdjustmentDto, CustomerCashbackQueryDto } from './dto/cashback.dto.js';
import { CustomerCashbackResponse } from './dto/cashback.response.js';

/** One customer's credit at the shop (BEELINK-238), as its owner reads and corrects it. */
@ApiTags('cashback')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · CUSTOMER_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/customers/:customerId/cashback')
export class CustomerCashbackController {
  constructor(private readonly cashback: CashbackService) {}

  @Get()
  @ApiOperation({ summary: "A customer's balance, what is pending, the lots still worth something and one page of the statement" })
  @ApiOkResponse({ type: CustomerCashbackResponse })
  get(
    @Param('storeSlug') storeSlug: string,
    @Param('customerId') customerId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: CustomerCashbackQueryDto,
  ): Promise<CustomerCashback> {
    return this.cashback.customer(storeSlug, current.id, customerId, query);
  }

  @Post('adjustments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Correct a customer's credit by hand, with a reason: positive gives, negative takes" })
  @ApiCreatedResponse({ type: CustomerCashbackResponse, description: "The customer's credit after it, the statement from its first page." })
  @ApiBadRequestResponse({ description: 'CASHBACK_ADJUSTMENT_INVALID' })
  @ApiConflictResponse({ description: 'CASHBACK_BALANCE_INSUFFICIENT — it takes more than the customer has · CASHBACK_BALANCE_TOO_LARGE — past R$ 1.000.000,00; nothing is written either way' })
  adjust(
    @Param('storeSlug') storeSlug: string,
    @Param('customerId') customerId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CashbackAdjustmentDto,
  ): Promise<CustomerCashback> {
    return this.cashback.adjust(storeSlug, current.id, customerId, dto);
  }
}
