// Nest
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { env } from '../../shared/config/env.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { PublishPageDto } from './dto/page-versions.dto.js';
import { PageDraftResponse, PublishPageResultResponse } from './dto/page-versions.response.js';
import { PageVersionsService } from './page-versions.service.js';

/** The shop's write limit, built here for the reason `StoresController` gives. */
const writeRateLimit = { max: env.STORE_WRITE_RATE_LIMIT_MAX, timeWindow: env.STORE_WRITE_RATE_LIMIT_WINDOW };

/** A page's draft and its versions: what the owner is editing, and what the shop serves. */
@ApiTags('pages')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PAGE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/pages/:pageId')
export class PageVersionsController {
  constructor(private readonly versions: PageVersionsService) {}

  @Get('draft')
  @ApiOperation({ summary: 'The draft, hidden bands and blocks included, and whether it differs from what is served' })
  @ApiOkResponse({ type: PageDraftResponse })
  draft(
    @Param('storeSlug') storeSlug: string,
    @Param('pageId') pageId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<PageDraftResponse> {
    return this.versions.draft(storeSlug, current.id, pageId);
  }

  @Post('publish')
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: 'The draft, frozen as the next version and served from now on; a landing goes up' })
  @ApiCreatedResponse({ type: PublishPageResultResponse })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many writes from this address' })
  publish(
    @Param('storeSlug') storeSlug: string,
    @Param('pageId') pageId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: PublishPageDto,
  ): Promise<PublishPageResultResponse> {
    return this.versions.publish(storeSlug, current.id, pageId, dto);
  }
}
