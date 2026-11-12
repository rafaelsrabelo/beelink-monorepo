// Nest
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { ShopAffiliate, ShopAffiliatePage } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { AffiliateListQueryDto, CreateAffiliateDto, UpdateAffiliateDto } from './dto/affiliate.dto.js';
import { ShopAffiliatePageResponse, ShopAffiliateResponse } from './dto/affiliate.response.js';
import { StoreAffiliatesService } from './store-affiliates.service.js';

/**
 * A shop's affiliates (IMPULSEIA-103), as its owner keeps them. Closed like every panel route, and
 * to a page locked for want of payment.
 */
@ApiTags('affiliates')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · AFFILIATE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN · PAGE_LOCKED' })
@Controller('stores/:storeSlug/affiliates')
export class StoreAffiliatesController {
  constructor(private readonly affiliates: StoreAffiliatesService) {}

  @Post()
  @ApiOperation({ summary: 'Invite someone to sell through the shop: INVITED, and the invite e-mailed' })
  @ApiCreatedResponse({ type: ShopAffiliateResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_INVALID' })
  @ApiConflictResponse({ description: 'AFFILIATE_EMAIL_TAKEN' })
  create(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: CreateAffiliateDto): Promise<ShopAffiliate> {
    return this.affiliates.create(storeSlug, current.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "The shop's affiliates, newest invited first, of one status or all" })
  @ApiOkResponse({ type: ShopAffiliatePageResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_INVALID' })
  list(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Query() query: AffiliateListQueryDto): Promise<ShopAffiliatePage> {
    return this.affiliates.list(storeSlug, current.id, query);
  }

  @Get(':affiliateId')
  @ApiOperation({ summary: 'One affiliate, whole' })
  @ApiOkResponse({ type: ShopAffiliateResponse })
  read(@Param('storeSlug') storeSlug: string, @Param('affiliateId') affiliateId: string, @CurrentUser() current: AuthenticatedUser): Promise<ShopAffiliate> {
    return this.affiliates.read(storeSlug, current.id, affiliateId);
  }

  @Patch(':affiliateId')
  @ApiOperation({ summary: "The affiliate's table and the shop's note. Another table applies to orders placed from now on" })
  @ApiOkResponse({ type: ShopAffiliateResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_INVALID' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('affiliateId') affiliateId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateAffiliateDto,
  ): Promise<ShopAffiliate> {
    return this.affiliates.update(storeSlug, current.id, affiliateId, dto);
  }

  @Delete(':affiliateId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancel an invite nobody accepted: the affiliate goes, and the e-mail may be invited again' })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'AFFILIATE_STATUS_INVALID' })
  async cancel(@Param('storeSlug') storeSlug: string, @Param('affiliateId') affiliateId: string, @CurrentUser() current: AuthenticatedUser): Promise<void> {
    await this.affiliates.cancel(storeSlug, current.id, affiliateId);
  }

  @Post(':affiliateId/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send the invite again: a new link for a week, and the one before stops working' })
  @ApiOkResponse({ type: ShopAffiliateResponse })
  @ApiConflictResponse({ description: 'AFFILIATE_STATUS_INVALID · AFFILIATE_INVITE_RECENTLY_SENT' })
  resend(@Param('storeSlug') storeSlug: string, @Param('affiliateId') affiliateId: string, @CurrentUser() current: AuthenticatedUser): Promise<ShopAffiliate> {
    return this.affiliates.resend(storeSlug, current.id, affiliateId);
  }

  @Post(':affiliateId/pause')
  @HttpCode(200)
  @ApiOperation({ summary: 'ACTIVE → PAUSED: no new order is credited to them' })
  @ApiOkResponse({ type: ShopAffiliateResponse })
  @ApiConflictResponse({ description: 'AFFILIATE_STATUS_INVALID' })
  pause(@Param('storeSlug') storeSlug: string, @Param('affiliateId') affiliateId: string, @CurrentUser() current: AuthenticatedUser): Promise<ShopAffiliate> {
    return this.affiliates.pause(storeSlug, current.id, affiliateId);
  }

  @Post(':affiliateId/resume')
  @HttpCode(200)
  @ApiOperation({ summary: 'PAUSED → ACTIVE' })
  @ApiOkResponse({ type: ShopAffiliateResponse })
  @ApiConflictResponse({ description: 'AFFILIATE_STATUS_INVALID' })
  resume(@Param('storeSlug') storeSlug: string, @Param('affiliateId') affiliateId: string, @CurrentUser() current: AuthenticatedUser): Promise<ShopAffiliate> {
    return this.affiliates.resume(storeSlug, current.id, affiliateId);
  }

  @Post(':affiliateId/end')
  @HttpCode(200)
  @ApiOperation({ summary: 'ACTIVE or PAUSED → ENDED, for good. The same e-mail may be invited again, as a new affiliate' })
  @ApiOkResponse({ type: ShopAffiliateResponse })
  @ApiConflictResponse({ description: 'AFFILIATE_STATUS_INVALID' })
  end(@Param('storeSlug') storeSlug: string, @Param('affiliateId') affiliateId: string, @CurrentUser() current: AuthenticatedUser): Promise<ShopAffiliate> {
    return this.affiliates.end(storeSlug, current.id, affiliateId);
  }
}
