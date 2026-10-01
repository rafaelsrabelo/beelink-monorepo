// Nest
import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
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
import type { Coupon, CouponPage, CouponRedemptionPage } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { CouponsService } from './coupons.service.js';
import { CouponDto, CouponListDto, CouponRedemptionListDto, SetDiscountActiveDto } from './dto/promotion.dto.js';
import { CouponPageResponse, CouponRedemptionPageResponse, CouponResponse } from './dto/promotion.response.js';

const REFUSED = 'COUPON_CODE_INVALID · COUPON_DISCOUNT_INVALID · COUPON_PERIOD_INVALID';

/**
 * The owner's coupons, and the orders each went into. Closed, like every panel route — the global
 * guard takes the shopkeeper's token and refuses a shopper's.
 */
@ApiTags('promotions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  @ApiOperation({ summary: "The shop's coupons, the newest first, by where each stands" })
  @ApiOkResponse({ type: CouponPageResponse })
  list(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Query() query: CouponListDto): Promise<CouponPage> {
    return this.coupons.list(storeSlug, current.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a coupon: a code for a discount or a free delivery, with its validity and limits' })
  @ApiCreatedResponse({ type: CouponResponse })
  @ApiBadRequestResponse({ description: REFUSED })
  @ApiConflictResponse({ description: 'COUPON_CODE_TAKEN' })
  create(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: CouponDto): Promise<Coupon> {
    return this.coupons.create(storeSlug, current.id, dto);
  }

  @Get(':couponId')
  @ApiOperation({ summary: 'One coupon, as its form edits it' })
  @ApiOkResponse({ type: CouponResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · COUPON_NOT_FOUND' })
  get(@Param('storeSlug') storeSlug: string, @Param('couponId') couponId: string, @CurrentUser() current: AuthenticatedUser): Promise<Coupon> {
    return this.coupons.get(storeSlug, current.id, couponId);
  }

  @Put(':couponId')
  @ApiOperation({ summary: 'Replace a coupon — a full body; orders that used it keep what they took' })
  @ApiOkResponse({ type: CouponResponse })
  @ApiBadRequestResponse({ description: REFUSED })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · COUPON_NOT_FOUND' })
  @ApiConflictResponse({ description: 'COUPON_CODE_TAKEN' })
  replace(
    @Param('storeSlug') storeSlug: string,
    @Param('couponId') couponId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CouponDto,
  ): Promise<Coupon> {
    return this.coupons.replace(storeSlug, current.id, couponId, dto);
  }

  @Patch(':couponId')
  @ApiOperation({ summary: 'Pause a coupon, or switch it back on' })
  @ApiOkResponse({ type: CouponResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · COUPON_NOT_FOUND' })
  setActive(
    @Param('storeSlug') storeSlug: string,
    @Param('couponId') couponId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: SetDiscountActiveDto,
  ): Promise<Coupon> {
    return this.coupons.setActive(storeSlug, current.id, couponId, dto);
  }

  @Get(':couponId/redemptions')
  @ApiOperation({ summary: 'The orders a coupon went into, the most recent first' })
  @ApiOkResponse({ type: CouponRedemptionPageResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · COUPON_NOT_FOUND' })
  redemptions(
    @Param('storeSlug') storeSlug: string,
    @Param('couponId') couponId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: CouponRedemptionListDto,
  ): Promise<CouponRedemptionPage> {
    return this.coupons.redemptions(storeSlug, current.id, couponId, query);
  }
}
