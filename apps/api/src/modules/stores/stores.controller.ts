// Nest
import { Body, Controller, Get, Param, Post, Put, Query, Res, UseInterceptors } from '@nestjs/common';
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

// Libs
import type { FastifyReply } from 'fastify';

// Types
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import type { LockedPage } from '../billing/page-locks.service.js';

// App
import { PricesChangeInterceptor } from '../promotions/prices-change.interceptor.js';
import { env } from '../../shared/config/env.js';
import { CurrentUser, Public } from '../auth/auth.decorators.js';
import { LOCK_CHANGES_AT_HEADER } from '../billing/billing.constants.js';
import { AnswersLockedPage, PageLockOf } from '../billing/page-lock.decorators.js';
import { StoreColorsDto } from './dto/store-fields.dto.js';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto.js';
import { ChangeStoreSlugDto, StoreSlugAvailabilityQueryDto, StoreSlugAvailabilityResponse } from './dto/store-slug.dto.js';
import { PublicStoreResponse, StoreResponse } from './dto/store.response.js';
import { STOREFRONT_RATE_LIMIT } from './stores.constants.js';
import { StoresService } from './stores.service.js';

/**
 * Keyed by IP, which only means anything because the API trusts the web app's forwarded address.
 * Built here and not in `stores.constants.ts`: that file is imported by the DTOs and by their unit
 * tests, and reading `env` there would make a `.env` a condition of loading them.
 */
const writeRateLimit = { max: env.STORE_WRITE_RATE_LIMIT_MAX, timeWindow: env.STORE_WRITE_RATE_LIMIT_WINDOW };

/**
 * `@ApiBearerAuth()` sits on the four closed handlers, never on the class. On the class it also
 * marked `GET :slug/public` — the one anonymous route in this module — so /api/docs told every
 * reader the storefront needs a token, and Try-it-out sent one.
 */
@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Post()
  @ApiBearerAuth()
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: 'Open a shop — the slug is claimed here, and changes afterwards by `PUT /stores/:slug/slug` alone' })
  @ApiCreatedResponse({ type: StoreResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  @ApiConflictResponse({ description: 'STORE_SLUG_TAKEN — held by a page, or left by one' })
  @ApiNotFoundResponse({ description: 'STORE_CATEGORY_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many writes from this address' })
  create(@CurrentUser() current: AuthenticatedUser, @Body() dto: CreateStoreDto): Promise<StoreResponse> {
    return this.stores.create(current.id, dto);
  }

  // Declared above `:slug`: Nest matches in declaration order, so `:slug` would swallow `mine`.
  // `mine` is on the reserved list too, so no shop can ever occupy it either.
  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: "The signed-in shopkeeper's shops, newest first" })
  @ApiOkResponse({ type: StoreResponse, isArray: true })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  mine(@CurrentUser() current: AuthenticatedUser): Promise<StoreResponse[]> {
    return this.stores.mine(current.id);
  }

  /**
   * A locked page's shop window (BEELINK-223) is answered here and not refused: a customer reaches their
   * orders through it. `x-lock-changes-at` says, where pages lock, when this answer may stop holding by
   * the clock alone — so a window is never served open past the instant its page locks.
   */
  @Get(':slug/public')
  @Public()
  @AnswersLockedPage()
  @UseInterceptors(PricesChangeInterceptor)
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: 'The shop window — everything an anonymous visitor is served, and no more. A page locked for want of payment answers who the shop is and nothing it sells, with `unavailable: true`' })
  @ApiOkResponse({ type: PublicStoreResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  publicBySlug(@Param('slug') slug: string, @PageLockOf() page: LockedPage | undefined, @Res({ passthrough: true }) reply: FastifyReply): Promise<PublicStoreResponse> {
    if (page?.changesAt) void reply.header(LOCK_CHANGES_AT_HEADER, page.changesAt.toISOString());
    return this.stores.publicBySlug(slug, Boolean(page?.lock));
  }

  @Get(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The shop as its owner edits it' })
  @ApiOkResponse({ type: StoreResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
  bySlug(@Param('slug') slug: string, @CurrentUser() current: AuthenticatedUser): Promise<StoreResponse> {
    return this.stores.bySlug(slug, current.id);
  }

  /**
   * The page's new address (BEELINK-331). Under `stores/:slug`, so a page locked for want of payment is
   * refused it (`PAGE_LOCKED`) like every route of a page that does not say otherwise.
   */
  @Put(':slug/slug')
  @ApiBearerAuth()
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: "A new address for the page, at most once every 30 days: the old one stays the page's and leads to the new" })
  @ApiOkResponse({ type: StoreResponse })
  @ApiBadRequestResponse({ description: 'STORE_SLUG_INVALID · STORE_SLUG_RESERVED · STORE_SLUG_UNCHANGED' })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · STORE_MOVED' })
  @ApiForbiddenResponse({ description: 'STORE_FORBIDDEN · PAGE_LOCKED' })
  @ApiConflictResponse({ description: 'STORE_SLUG_TAKEN · STORE_SLUG_CHANGE_TOO_SOON (with `details.changeableOn`)' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many writes from this address' })
  changeSlug(
    @Param('slug') slug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ChangeStoreSlugDto,
  ): Promise<StoreResponse> {
    return this.stores.changeSlug(slug, current.id, dto.slug);
  }

  @Get(':slug/slug-availability')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Whether an address may be the page's new one, normalised as it would be stored" })
  @ApiOkResponse({ type: StoreSlugAvailabilityResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · STORE_MOVED' })
  @ApiForbiddenResponse({ description: 'STORE_FORBIDDEN · PAGE_LOCKED' })
  slugAvailability(
    @Param('slug') slug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: StoreSlugAvailabilityQueryDto,
  ): Promise<StoreSlugAvailabilityResponse> {
    return this.stores.slugAvailability(slug, current.id, query.slug);
  }

  @Put(':slug/colors')
  @ApiBearerAuth()
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: "The shop's four colours, and nothing else it owns" })
  @ApiOkResponse({ type: StoreResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many writes from this address' })
  updateColors(
    @Param('slug') slug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: StoreColorsDto,
  ): Promise<StoreResponse> {
    return this.stores.updateColors(slug, current.id, dto);
  }

  @Put(':slug')
  @ApiBearerAuth()
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: 'Replace what the panel edits — a full body, not a patch' })
  @ApiOkResponse({ type: StoreResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND or STORE_CATEGORY_NOT_FOUND' })
  @ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many writes from this address' })
  update(
    @Param('slug') slug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateStoreDto,
  ): Promise<StoreResponse> {
    return this.stores.update(slug, current.id, dto);
  }
}
