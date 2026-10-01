// Nest
import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { Promotion, PromotionPage } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { PromotionDto, PromotionListDto, SetDiscountActiveDto } from './dto/promotion.dto.js';
import { PromotionPageResponse, PromotionResponse } from './dto/promotion.response.js';
import { PromotionsService } from './promotions.service.js';

const REFUSED = 'PROMOTION_DISCOUNT_INVALID · PROMOTION_PERIOD_INVALID · PROMOTION_TARGETS_INVALID';

/**
 * The owner's promotions. Closed, like every panel route — the global guard takes the shopkeeper's
 * token and refuses a shopper's.
 */
@ApiTags('promotions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: "The shop's promotions, the newest first, by where each stands" })
  @ApiOkResponse({ type: PromotionPageResponse })
  list(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Query() query: PromotionListDto): Promise<PromotionPage> {
    return this.promotions.list(storeSlug, current.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a promotion: a discount over the cart, or over named products or categories, for a period' })
  @ApiCreatedResponse({ type: PromotionResponse })
  @ApiBadRequestResponse({ description: REFUSED })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PROMOTION_TARGET_NOT_FOUND' })
  create(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: PromotionDto): Promise<Promotion> {
    return this.promotions.create(storeSlug, current.id, dto);
  }

  @Get(':promotionId')
  @ApiOperation({ summary: 'One promotion, as its form edits it' })
  @ApiOkResponse({ type: PromotionResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PROMOTION_NOT_FOUND' })
  get(@Param('storeSlug') storeSlug: string, @Param('promotionId') promotionId: string, @CurrentUser() current: AuthenticatedUser): Promise<Promotion> {
    return this.promotions.get(storeSlug, current.id, promotionId);
  }

  @Put(':promotionId')
  @ApiOperation({ summary: 'Replace a promotion — a full body, its products and categories included' })
  @ApiOkResponse({ type: PromotionResponse })
  @ApiBadRequestResponse({ description: REFUSED })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PROMOTION_NOT_FOUND · PROMOTION_TARGET_NOT_FOUND' })
  replace(
    @Param('storeSlug') storeSlug: string,
    @Param('promotionId') promotionId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: PromotionDto,
  ): Promise<Promotion> {
    return this.promotions.replace(storeSlug, current.id, promotionId, dto);
  }

  @Patch(':promotionId')
  @ApiOperation({ summary: 'Pause a promotion, or switch it back on' })
  @ApiOkResponse({ type: PromotionResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PROMOTION_NOT_FOUND' })
  setActive(
    @Param('storeSlug') storeSlug: string,
    @Param('promotionId') promotionId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: SetDiscountActiveDto,
  ): Promise<Promotion> {
    return this.promotions.setActive(storeSlug, current.id, promotionId, dto);
  }
}
