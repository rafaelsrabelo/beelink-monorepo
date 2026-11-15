// Nest
import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { AffiliatePageOverview, ShopAffiliateApplication, ShopAffiliateApplicationPage } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { AffiliateApplicationsService } from './affiliate-applications.service.js';
import { AffiliatePageService } from './affiliate-page.service.js';
import { AffiliateApplicationApprovalDto, AffiliateApplicationQueryDto, AffiliatePageDto } from './dto/affiliate-page.dto.js';
import { AffiliatePageOverviewResponse, ShopAffiliateApplicationPageResponse, ShopAffiliateApplicationResponse } from './dto/affiliate-page.response.js';

/**
 * A shop's "Seja afiliado" page and the applications it took (plan 2026-11-14), as its owner keeps
 * them. Closed like every panel route, and to a page locked for want of payment. What a visitor reads
 * and sends is `StorefrontAffiliatePageController`'s, on paths of its own.
 */
@ApiTags('affiliates')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN · PAGE_LOCKED' })
@Controller('stores/:storeSlug')
export class AffiliatePageController {
  constructor(
    private readonly pages: AffiliatePageService,
    private readonly applications: AffiliateApplicationsService,
  ) {}

  @Get('affiliate-page')
  @ApiOperation({ summary: 'The page as its owner edits it, why visitors do not see it, the rate it announces and the applications waiting' })
  @ApiOkResponse({ type: AffiliatePageOverviewResponse })
  overview(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<AffiliatePageOverview> {
    return this.pages.overview(storeSlug, current.id);
  }

  @Put('affiliate-page')
  @ApiOperation({ summary: 'Save the page, whole: whether it is open, where the shop window leads to it, the table it announces, how applications are decided and its texts' })
  @ApiOkResponse({ type: AffiliatePageOverviewResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_PAGE_INVALID' })
  @ApiConflictResponse({ description: 'COMMISSION_TABLE_PERSONAL' })
  save(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: AffiliatePageDto): Promise<AffiliatePageOverview> {
    return this.pages.save(storeSlug, current.id, dto);
  }

  @Get('affiliate-applications')
  @ApiOperation({ summary: 'The applications, newest first, by status; and how many wait' })
  @ApiOkResponse({ type: ShopAffiliateApplicationPageResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_APPLICATION_INVALID' })
  list(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Query() query: AffiliateApplicationQueryDto): Promise<ShopAffiliateApplicationPage> {
    return this.applications.list(storeSlug, current.id, query);
  }

  @Post('affiliate-applications/:applicationId/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve: the person invited, as the shop\'s own form invites — without the CPF, which they give on accepting' })
  @ApiOkResponse({ type: ShopAffiliateApplicationResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_APPLICATION_INVALID' })
  @ApiConflictResponse({ description: 'AFFILIATE_APPLICATION_DECIDED · AFFILIATE_EMAIL_TAKEN · COMMISSION_TABLE_PERSONAL' })
  approve(
    @Param('storeSlug') storeSlug: string,
    @Param('applicationId') applicationId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: AffiliateApplicationApprovalDto,
  ): Promise<ShopAffiliateApplication> {
    return this.applications.approve(storeSlug, current.id, applicationId, dto);
  }

  @Post('affiliate-applications/:applicationId/refuse')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refuse. The person is not told; the application is deleted 90 days on' })
  @ApiOkResponse({ type: ShopAffiliateApplicationResponse })
  @ApiConflictResponse({ description: 'AFFILIATE_APPLICATION_DECIDED' })
  refuse(@Param('storeSlug') storeSlug: string, @Param('applicationId') applicationId: string, @CurrentUser() current: AuthenticatedUser): Promise<ShopAffiliateApplication> {
    return this.applications.refuse(storeSlug, current.id, applicationId);
  }
}
