// Nest
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { AffiliateHome, AffiliateOrderPage, AffiliatePayoutPage, AffiliateProductPage, AffiliateProfile, AffiliateShop, AffiliateStatement } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { OpenWhileLocked } from '../billing/page-lock.decorators.js';
import { AffiliateAreaService } from './affiliate-area.service.js';
import { AffiliateAreaPageQueryDto, AffiliateProductQueryDto, AffiliateProfileDto } from './dto/affiliate-area.dto.js';
import { AffiliateHomeResponse, AffiliateOrderPageResponse, AffiliatePayoutPageResponse, AffiliateProductPageResponse, AffiliateProfileResponse, AffiliateShopResponse } from './dto/affiliate-area.response.js';
import { AffiliateStatementResponse } from './dto/affiliate-money.response.js';

/**
 * The affiliate's own area (IMPULSEIA-108): what a bee-link account reads of the shops it sells for,
 * by its standing with each — never through the shop's routes. Open to a page locked for want of
 * payment (rule 12 of apps/api/AGENTS.md): what the shop owes its affiliate does not vanish because
 * the shop did not pay bee-link.
 */
@ApiTags('affiliate-area')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@OpenWhileLocked()
@Controller('affiliate/stores')
export class AffiliateAreaController {
  constructor(private readonly area: AffiliateAreaService) {}

  @Get()
  @ApiOperation({ summary: 'The shops this account sells for: one standing each, the live before the ended' })
  @ApiOkResponse({ type: [AffiliateShopResponse] })
  shops(@CurrentUser() current: AuthenticatedUser): Promise<AffiliateShop[]> {
    return this.area.shops(current.id);
  }

  @Get(':storeSlug')
  @ApiOperation({ summary: 'The front page at one shop: the standing, the balances, the next payment, the last 30 days, their own data' })
  @ApiOkResponse({ type: AffiliateHomeResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · STORE_MOVED · AFFILIATE_NOT_FOUND' })
  home(@CurrentUser() current: AuthenticatedUser, @Param('storeSlug') storeSlug: string): Promise<AffiliateHome> {
    return this.area.home(current.id, storeSlug);
  }

  @Get(':storeSlug/products')
  @ApiOperation({ summary: "The shop's products on the shelf, by name, each with the link that credits the affiliate and what it pays them" })
  @ApiOkResponse({ type: AffiliateProductPageResponse })
  @ApiNotFoundResponse({ description: 'AFFILIATE_NOT_FOUND' })
  @ApiConflictResponse({ description: 'AFFILIATE_STATUS_INVALID — an ended standing has no links' })
  products(@CurrentUser() current: AuthenticatedUser, @Param('storeSlug') storeSlug: string, @Query() query: AffiliateProductQueryDto): Promise<AffiliateProductPage> {
    return this.area.products(current.id, storeSlug, query);
  }

  @Get(':storeSlug/orders')
  @ApiOperation({ summary: "The orders credited to the affiliate, newest first — the customer by name, never how to reach them" })
  @ApiOkResponse({ type: AffiliateOrderPageResponse })
  @ApiNotFoundResponse({ description: 'AFFILIATE_NOT_FOUND' })
  orders(@CurrentUser() current: AuthenticatedUser, @Param('storeSlug') storeSlug: string, @Query() query: AffiliateAreaPageQueryDto): Promise<AffiliateOrderPage> {
    return this.area.orders(current.id, storeSlug, query);
  }

  @Get(':storeSlug/statement')
  @ApiOperation({ summary: "Their balances and statement, the shop's reasons included, never who wrote a line" })
  @ApiOkResponse({ type: AffiliateStatementResponse })
  @ApiNotFoundResponse({ description: 'AFFILIATE_NOT_FOUND' })
  statement(@CurrentUser() current: AuthenticatedUser, @Param('storeSlug') storeSlug: string, @Query() query: AffiliateAreaPageQueryDto): Promise<AffiliateStatement> {
    return this.area.statement(current.id, storeSlug, query);
  }

  @Get(':storeSlug/payouts')
  @ApiOperation({ summary: 'The payments the shop registered for them, the latest paid first' })
  @ApiOkResponse({ type: AffiliatePayoutPageResponse })
  @ApiNotFoundResponse({ description: 'AFFILIATE_NOT_FOUND' })
  payouts(@CurrentUser() current: AuthenticatedUser, @Param('storeSlug') storeSlug: string, @Query() query: AffiliateAreaPageQueryDto): Promise<AffiliatePayoutPage> {
    return this.area.payouts(current.id, storeSlug, query);
  }

  @Patch(':storeSlug/profile')
  @ApiOperation({ summary: 'Their Pix key, phone, photo and phrase; a key left out is left alone. Ended, only the Pix key and the phone' })
  @ApiOkResponse({ type: AffiliateProfileResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_PROFILE_INVALID' })
  @ApiNotFoundResponse({ description: 'AFFILIATE_NOT_FOUND' })
  @ApiConflictResponse({ description: 'AFFILIATE_STATUS_INVALID' })
  updateProfile(@CurrentUser() current: AuthenticatedUser, @Param('storeSlug') storeSlug: string, @Body() dto: AffiliateProfileDto): Promise<AffiliateProfile> {
    return this.area.updateProfile(current.id, storeSlug, dto);
  }
}
