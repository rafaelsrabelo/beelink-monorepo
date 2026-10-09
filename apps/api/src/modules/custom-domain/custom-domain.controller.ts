// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { CustomDomainOverview } from '@harness-monorepo/contracts';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { env } from '../../shared/config/env.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { CustomDomainService } from './custom-domain.service.js';
import { SaveCustomDomainDto } from './dto/custom-domain.dto.js';
import { CustomDomainOverviewResponse } from './dto/custom-domain.response.js';

/**
 * Saving and checking each wait on a DNS lookup and on a call to the domain, for seconds: the limit
 * of the shop's own writes, which bounds an outbound call in the same way. Keyed by IP.
 */
const checkRateLimit = { max: env.STORE_WRITE_RATE_LIMIT_MAX, timeWindow: env.STORE_WRITE_RATE_LIMIT_WINDOW };

/** A shop's own domain (BEELINK-281), as its owner saves, checks and removes it. Closed, like every panel route. */
@ApiTags('custom-domain')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/custom-domain')
export class CustomDomainController {
  constructor(private readonly domains: CustomDomainService) {}

  @Get()
  @ApiOperation({ summary: "The shop's own domain and where it stands, with the addresses to point it at — null where this deployment names none" })
  @ApiOkResponse({ type: CustomDomainOverviewResponse })
  overview(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<CustomDomainOverview> {
    return this.domains.overview(storeSlug, current.id);
  }

  @Put()
  @RouteConfig({ rateLimit: checkRateLimit })
  @ApiOperation({ summary: "Save the shop's domain, or replace the one saved: read down to the bare host, kept PENDING, checked there and then — its DNS, then https — and answered with what the check found" })
  @ApiOkResponse({ type: CustomDomainOverviewResponse })
  @ApiBadRequestResponse({ description: 'CUSTOM_DOMAIN_INVALID · CUSTOM_DOMAIN_IP_ADDRESS · CUSTOM_DOMAIN_LOCAL · CUSTOM_DOMAIN_NOT_ASCII · CUSTOM_DOMAIN_PLATFORM' })
  @ApiConflictResponse({ description: 'CUSTOM_DOMAIN_TAKEN: another shop has it' })
  @ApiServiceUnavailableResponse({ description: 'CUSTOM_DOMAIN_UNAVAILABLE: this deployment has no SHOP_DOMAIN_TARGET_IPS' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  save(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: SaveCustomDomainDto): Promise<CustomDomainOverview> {
    return this.domains.save(storeSlug, current.id, dto);
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: checkRateLimit })
  @ApiOperation({ summary: 'Check the saved domain again, now. Found right, it turns ACTIVE; found wrong, the problem is answered and kept, and an ACTIVE domain stays ACTIVE' })
  @ApiOkResponse({ type: CustomDomainOverviewResponse })
  @ApiConflictResponse({ description: 'CUSTOM_DOMAIN_NOT_SET: the shop has no domain saved' })
  @ApiServiceUnavailableResponse({ description: 'CUSTOM_DOMAIN_UNAVAILABLE: this deployment has no SHOP_DOMAIN_TARGET_IPS' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  check(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<CustomDomainOverview> {
    return this.domains.check(storeSlug, current.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove the shop's domain: the host is free for any shop again, and the shop's public data stops carrying one" })
  @ApiNoContentResponse()
  remove(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<void> {
    return this.domains.remove(storeSlug, current.id);
  }
}
