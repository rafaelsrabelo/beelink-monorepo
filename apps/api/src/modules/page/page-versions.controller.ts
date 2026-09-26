// Nest
import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
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
import {
  PageDraftResponse,
  PageProblemResponse,
  PageVersionSummaryResponse,
  PublishPageResultResponse,
} from './dto/page-versions.response.js';
import { PAGE_REVISION_DOC, PageRevision } from './page-revision.decorator.js';
import { PageVersionsService } from './page-versions.service.js';

/** The shop's write limit, built here for the reason `StoresController` gives. */
const writeRateLimit = { max: env.STORE_WRITE_RATE_LIMIT_MAX, timeWindow: env.STORE_WRITE_RATE_LIMIT_WINDOW };

/** A page's draft and its versions: what the owner is editing, and what the shop serves. */
@ApiTags('pages')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PAGE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@ApiHeader(PAGE_REVISION_DOC)
@ApiConflictResponse({ description: 'PAGE_DRAFT_STALE — another tab wrote to this page since this one read it' })
@Controller('stores/:storeSlug/pages/:pageId')
export class PageVersionsController {
  constructor(private readonly drafts: PageVersionsService) {}

  @Get('draft')
  @ApiOperation({ summary: 'The draft, hidden bands and blocks included, and whether it differs from what is served' })
  @ApiOkResponse({ type: PageDraftResponse })
  draft(
    @Param('storeSlug') storeSlug: string,
    @Param('pageId') pageId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<PageDraftResponse> {
    return this.drafts.draft(storeSlug, current.id, pageId);
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
    @PageRevision() revision: number | undefined,
  ): Promise<PublishPageResultResponse> {
    return this.drafts.publish(storeSlug, current.id, pageId, dto, revision);
  }

  @Get('versions')
  @ApiOperation({ summary: 'Every version, newest first; the newest is live while the page is up' })
  @ApiOkResponse({ type: PageVersionSummaryResponse, isArray: true })
  history(
    @Param('storeSlug') storeSlug: string,
    @Param('pageId') pageId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<PageVersionSummaryResponse[]> {
    return this.drafts.versions(storeSlug, current.id, pageId);
  }

  @Post('versions/:versionId/restore')
  @HttpCode(200)
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: 'A version copied into the draft, which it replaces. It is not published' })
  @ApiOkResponse({ type: PageDraftResponse })
  @ApiNotFoundResponse({ description: 'PAGE_VERSION_NOT_FOUND' })
  restore(
    @Param('storeSlug') storeSlug: string,
    @Param('pageId') pageId: string,
    @Param('versionId') versionId: string,
    @CurrentUser() current: AuthenticatedUser,
    @PageRevision() revision: number | undefined,
  ): Promise<PageDraftResponse> {
    return this.drafts.restore(storeSlug, current.id, pageId, versionId, revision);
  }

  @Get('problems')
  @ApiOperation({ summary: 'What Publicar would serve that the owner may not mean to. None stops a publish' })
  @ApiOkResponse({ type: PageProblemResponse, isArray: true })
  problems(
    @Param('storeSlug') storeSlug: string,
    @Param('pageId') pageId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<PageProblemResponse[]> {
    return this.drafts.problems(storeSlug, current.id, pageId);
  }
}
