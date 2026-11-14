// Nest
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiAcceptedResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// Types
import type { PublicAffiliatePage } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { AffiliateApplicationsService } from './affiliate-applications.service.js';
import { AffiliatePageService } from './affiliate-page.service.js';
import { AffiliateApplicationDto } from './dto/affiliate-page.dto.js';
import { PublicAffiliatePageResponse } from './dto/affiliate-page.response.js';

/** A public write that keeps a stranger's data: a person applies once, and a few more tries cover a typo. */
const applicationRateLimit = { max: env.AFFILIATE_APPLICATION_RATE_LIMIT_MAX, timeWindow: env.AFFILIATE_APPLICATION_RATE_LIMIT_WINDOW };

/**
 * The shop's "Seja afiliado" page as a visitor reads and applies through it (plan 2026-11-14). Its own
 * controller on paths of its own, apart from the owner's, for the reason the affiliate link's is: two
 * controllers on one path with different guards is where a `@Public()` in the wrong place opens the
 * other. A page off the air answers its visitor `STORE_UNAVAILABLE`, as every route of the shop does.
 */
@ApiTags('affiliates')
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · STORE_MOVED · AFFILIATE_PAGE_CLOSED' })
@Controller('stores/:storeSlug/affiliate-join')
export class StorefrontAffiliatePageController {
  constructor(
    private readonly pages: AffiliatePageService,
    private readonly applications: AffiliateApplicationsService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "The page as the shop wrote it, the rate it announces and the programme's terms — while visitors see it" })
  @ApiOkResponse({ type: PublicAffiliatePageResponse })
  read(@Param('storeSlug') storeSlug: string): Promise<PublicAffiliatePage> {
    return this.pages.publicPage(storeSlug);
  }

  @Post('applications')
  @Public()
  @HttpCode(202)
  @RouteConfig({ rateLimit: applicationRateLimit })
  @ApiOperation({
    summary: 'Apply to be the shop\'s affiliate. Answered 202 alike whatever became of it',
    description: 'Kept for the shop to decide — or, where it invites at once, the invite sent. An e-mail already waiting replaces what it said; one of an affiliate of the shop, or a form whose hidden field was filled, keeps nothing.',
  })
  @ApiAcceptedResponse()
  @ApiBadRequestResponse({ description: 'AFFILIATE_APPLICATION_INVALID' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  apply(@Param('storeSlug') storeSlug: string, @Body() dto: AffiliateApplicationDto): Promise<void> {
    return this.applications.submit(storeSlug, dto);
  }
}
