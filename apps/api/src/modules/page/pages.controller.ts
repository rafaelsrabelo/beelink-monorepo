// Nest
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
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
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { env } from '../../shared/config/env.js';
import { CurrentUser, Public } from '../auth/auth.decorators.js';
import { STOREFRONT_RATE_LIMIT } from '../stores/stores.constants.js';
import { CreateLandingDto, PageSlugQueryDto, UpdatePageDto } from './dto/pages.dto.js';
import {
  PagePreviewResponse,
  PageSlugAvailabilityResponse,
  PublicLandingResponse,
  StorePageResponse,
} from './dto/pages.response.js';
import { LandingReadService } from './landing-read.service.js';
import { PagesService } from './pages.service.js';

/** The shop's write limit, built here for the reason `StoresController` gives: `env` is not read by a constants file. */
const writeRateLimit = { max: env.STORE_WRITE_RATE_LIMIT_MAX, timeWindow: env.STORE_WRITE_RATE_LIMIT_WINDOW };

/** A shop's pages, as their owner manages them. The bands on each are `SectionsController`'s, with `?pageId=`. */
@ApiTags('pages')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PAGE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/pages')
export class PagesController {
  constructor(
    private readonly pages: PagesService,
    private readonly landings: LandingReadService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'The home, then the landings, newest first — archived ones included' })
  @ApiOkResponse({ type: StorePageResponse, isArray: true })
  list(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<StorePageResponse[]> {
    return this.pages.list(storeSlug, current.id);
  }

  @Post()
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: 'A landing, as a draft, with the bands its template opens with' })
  @ApiCreatedResponse({ type: StorePageResponse })
  @ApiBadRequestResponse({
    description: 'PAGE_SLUG_INVALID · PAGE_TEMPLATE_UNAVAILABLE · PAGE_PRODUCT_REQUIRED · PAGE_PRODUCT_INVALID',
  })
  @ApiConflictResponse({ description: 'PAGE_SLUG_TAKEN' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many writes from this address' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateLandingDto,
  ): Promise<StorePageResponse> {
    return this.pages.create(storeSlug, current.id, dto);
  }

  // Declared above `:pageId`, which would otherwise read `availability` as a page's id.
  @Get('availability')
  @ApiOperation({ summary: 'Whether an address is free, normalised as it would be stored' })
  @ApiOkResponse({ type: PageSlugAvailabilityResponse })
  availability(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: PageSlugQueryDto,
  ): Promise<PageSlugAvailabilityResponse> {
    return this.pages.availability(storeSlug, current.id, query.slug, query.except);
  }

  @Patch(':pageId')
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: 'A patch of a landing: its name, address, menu mark, frame, status or search words' })
  @ApiOkResponse({ type: StorePageResponse })
  @ApiBadRequestResponse({ description: 'PAGE_HOME_FIXED · PAGE_SLUG_INVALID' })
  @ApiConflictResponse({ description: 'PAGE_SLUG_TAKEN' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many writes from this address' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('pageId') pageId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdatePageDto,
  ): Promise<StorePageResponse> {
    return this.pages.update(storeSlug, current.id, pageId, dto);
  }

  @Get(':pageId/preview')
  @ApiOperation({ summary: 'A page as it would be served, whatever its status: the editor’s canvas' })
  @ApiOkResponse({ type: PagePreviewResponse })
  preview(
    @Param('storeSlug') storeSlug: string,
    @Param('pageId') pageId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<PagePreviewResponse> {
    return this.landings.preview(storeSlug, current.id, pageId);
  }
}

/**
 * A published landing, to anyone. A path of its own and not a route on `PagesController`, for the
 * reason `StorefrontController` gives: two guards on one path is where a `@Public()` in the wrong
 * place quietly opens the other.
 */
@ApiTags('storefront')
@Controller('stores/:storeSlug/landings')
export class PublicLandingsController {
  constructor(private readonly landings: LandingReadService) {}

  @Get(':pageSlug')
  @Public()
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: 'A published landing, its bands resolved as the home’s are' })
  @ApiOkResponse({ type: PublicLandingResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PAGE_NOT_FOUND — also a draft or an archived landing' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  landing(@Param('storeSlug') storeSlug: string, @Param('pageSlug') pageSlug: string): Promise<PublicLandingResponse> {
    return this.landings.publicLanding(storeSlug, pageSlug);
  }
}
