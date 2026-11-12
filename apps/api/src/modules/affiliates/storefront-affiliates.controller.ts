// Nest
import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBadRequestResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// Types
import type { PublicAffiliateLink } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { AffiliateLinksService } from './affiliate-links.service.js';
import { AffiliateLinkQueryDto, AffiliateVisitDto } from './dto/affiliate-link.dto.js';
import { PublicAffiliateLinkResponse } from './dto/affiliate-link.response.js';

/** The funnel's own limit: a visit counted is the same kind of thing as a step counted, and keyed by the address alone. */
const visitRateLimit = { max: env.FUNNEL_RATE_LIMIT_MAX, timeWindow: env.FUNNEL_RATE_LIMIT_WINDOW };

/**
 * An affiliate's link as the shop window reads it (IMPULSEIA-105). Anyone may ask: it answers only
 * what the window shows of an affiliate, and a visit can only raise a day's number by one.
 *
 * Its own controller on paths of its own, apart from the owner's `affiliates` routes, for the reason
 * the funnel's is: two controllers on one path with different guards is where a `@Public()` in the
 * wrong place opens the other. A page off the air answers its visitor `STORE_UNAVAILABLE`, as every
 * route of the shop does.
 */
@ApiTags('affiliates')
@Controller('stores/:storeSlug')
export class StorefrontAffiliatesController {
  constructor(private readonly links: AffiliateLinksService) {}

  @Get('affiliate-link')
  @Public()
  @ApiOperation({
    summary: "Whom a link of the shop's names — by `?slug=` or by `?id=`, one of the two",
    description: "The affiliate is answered only while they are ACTIVE, the shop's programme is on and links are switched on in this deployment; any other affiliate's link is answered with `affiliate: null`.",
  })
  @ApiOkResponse({ type: PublicAffiliateLinkResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · STORE_MOVED · AFFILIATE_LINK_NOT_FOUND' })
  link(@Param('storeSlug') storeSlug: string, @Query() query: AffiliateLinkQueryDto): Promise<PublicAffiliateLink> {
    return this.links.link(storeSlug, query);
  }

  @Post('affiliate-visits')
  @Public()
  @HttpCode(204)
  @RouteConfig({ rateLimit: visitRateLimit })
  @ApiOperation({
    summary: "A visit through an affiliate's link. Answered 204 whether or not it counted",
    description: "Raises by one the affiliate's visits today, on the shop's clock, in one statement — only for a link that credits someone. No cookie, address or browser is read or kept.",
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'BAD_REQUEST — no affiliate id, or any other field' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  visit(@Param('storeSlug') storeSlug: string, @Body() dto: AffiliateVisitDto): Promise<void> {
    return this.links.visit(storeSlug, dto.affiliateId);
  }
}
