// Nest
import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
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
import type { AffiliateOwed, AffiliateStatement, OrderAffiliate } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { OrderNumberPipe } from '../orders/order-number.pipe.js';
import { AffiliateMoneyService } from './affiliate-money.service.js';
import { AffiliateOrderChangesService } from './affiliate-order-changes.service.js';
import { AffiliateAdjustmentDto, AffiliatePayoutDto, AffiliateStatementQueryDto, OrderAffiliateDto } from './dto/affiliate-money.dto.js';
import { AffiliateOwedResponse, AffiliateStatementResponse, OrderAffiliateResponse } from './dto/affiliate-money.response.js';

/**
 * The shop's money with its affiliates (IMPULSEIA-107), as its owner keeps it: whom each order is
 * credited to, each affiliate's statement, the adjustments and payouts, and what is owed by due day.
 * Closed like every panel route, and to a page locked for want of payment.
 */
@ApiTags('affiliates')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN · PAGE_LOCKED' })
@Controller('stores/:storeSlug')
export class AffiliateMoneyController {
  constructor(
    private readonly money: AffiliateMoneyService,
    private readonly orders: AffiliateOrderChangesService,
  ) {}

  @Get('orders/:number/affiliate')
  @ApiOperation({ summary: 'Whom the order is credited to, its commission and every change of it' })
  @ApiOkResponse({ type: OrderAffiliateResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · ORDER_NOT_FOUND' })
  orderAffiliate(@Param('storeSlug') storeSlug: string, @Param('number', OrderNumberPipe) number: number, @CurrentUser() current: AuthenticatedUser): Promise<OrderAffiliate> {
    return this.orders.read(storeSlug, current.id, number);
  }

  @Put('orders/:number/affiliate')
  @ApiOperation({ summary: 'Credit the order to another affiliate, or to nobody, while its commission is pending — and why' })
  @ApiOkResponse({ type: OrderAffiliateResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_ORDER_CHANGE_INVALID' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · ORDER_NOT_FOUND · AFFILIATE_NOT_FOUND' })
  @ApiConflictResponse({ description: 'ORDER_CANCELLED · AFFILIATE_COMMISSION_NOT_PENDING · AFFILIATE_ATTRIBUTION_CLOSED · AFFILIATE_STATUS_INVALID' })
  changeOrderAffiliate(
    @Param('storeSlug') storeSlug: string,
    @Param('number', OrderNumberPipe) number: number,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: OrderAffiliateDto,
  ): Promise<OrderAffiliate> {
    return this.orders.change(storeSlug, current.id, number, dto);
  }

  @Get('affiliates/:affiliateId/statement')
  @ApiOperation({ summary: "An affiliate's balances and statement, newest first" })
  @ApiOkResponse({ type: AffiliateStatementResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_INVALID' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · AFFILIATE_NOT_FOUND' })
  statement(
    @Param('storeSlug') storeSlug: string,
    @Param('affiliateId') affiliateId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: AffiliateStatementQueryDto,
  ): Promise<AffiliateStatement> {
    return this.money.statement(storeSlug, current.id, affiliateId, query);
  }

  @Post('affiliates/:affiliateId/adjustments')
  @ApiOperation({ summary: "The shop's correction of what it owes, either way, with its reason" })
  @ApiCreatedResponse({ type: AffiliateStatementResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_ADJUSTMENT_INVALID' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · AFFILIATE_NOT_FOUND' })
  @ApiConflictResponse({ description: 'AFFILIATE_STATUS_INVALID' })
  adjust(@Param('storeSlug') storeSlug: string, @Param('affiliateId') affiliateId: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: AffiliateAdjustmentDto): Promise<AffiliateStatement> {
    return this.money.adjust(storeSlug, current.id, affiliateId, dto);
  }

  @Post('affiliates/:affiliateId/payouts')
  @ApiOperation({ summary: 'Record a payment made outside bee-link, up to what is available' })
  @ApiCreatedResponse({ type: AffiliateStatementResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_PAYOUT_INVALID' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · AFFILIATE_NOT_FOUND' })
  @ApiConflictResponse({ description: 'AFFILIATE_PAYOUT_EXCEEDS_BALANCE · AFFILIATE_STATUS_INVALID' })
  payout(@Param('storeSlug') storeSlug: string, @Param('affiliateId') affiliateId: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: AffiliatePayoutDto): Promise<AffiliateStatement> {
    return this.money.payout(storeSlug, current.id, affiliateId, dto);
  }

  @Get('affiliate-program/owed')
  @ApiOperation({ summary: 'What the shop owes its affiliates, by due day, and each one\'s part' })
  @ApiOkResponse({ type: AffiliateOwedResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  owed(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<AffiliateOwed> {
    return this.money.owed(storeSlug, current.id);
  }
}
