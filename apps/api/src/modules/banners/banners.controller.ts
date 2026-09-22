// Nest
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
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
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { CurrentUser } from '../auth/auth.decorators.js';
import { BannersService } from './banners.service.js';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto.js';
import { BannerResponse } from './dto/banner.response.js';
import { ReorderDto } from '../catalog/dto/reorder.dto.js';

/**
 * The shop's posters, scoped to one shop by the path.
 *
 * There is no public route here. A visitor never asks for banners on their own — they arrive
 * already resolved on `PublicStore`, which the shop window fetches first and unconditionally, so a
 * second anonymous endpoint would be a second round trip for something already in hand.
 */
@ApiTags('banners')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · BANNER_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/banners')
export class BannersController {
  constructor(private readonly banners: BannersService) {}

  @Get()
  @ApiOperation({ summary: "The shop's banners, hidden ones included, in the chosen order" })
  @ApiOkResponse({ type: BannerResponse, isArray: true })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<BannerResponse[]> {
    return this.banners.list(storeSlug, current.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a banner. It lands last in the shop’s order' })
  @ApiCreatedResponse({ type: BannerResponse })
  @ApiBadRequestResponse({ description: 'BANNER_TARGET_INVALID' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateBannerDto,
  ): Promise<BannerResponse> {
    return this.banners.create(storeSlug, current.id, dto);
  }

  // Declared above `:bannerId`: Nest matches in declaration order, so the parameter would
  // otherwise swallow `reorder` — the same rule the catalogue's controller follows.
  @Put('reorder')
  @ApiOperation({ summary: 'The whole list, in the new order' })
  @ApiOkResponse({ type: BannerResponse, isArray: true })
  @ApiConflictResponse({ description: 'BANNER_REORDER_MISMATCH' })
  reorder(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ReorderDto,
  ): Promise<BannerResponse[]> {
    return this.banners.reorder(storeSlug, current.id, dto);
  }

  @Put(':bannerId')
  @ApiOperation({ summary: 'A patch. Moving the destination means naming the target with it' })
  @ApiOkResponse({ type: BannerResponse })
  @ApiBadRequestResponse({ description: 'BANNER_TARGET_INVALID' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('bannerId') bannerId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateBannerDto,
  ): Promise<BannerResponse> {
    return this.banners.update(storeSlug, current.id, bannerId, dto);
  }

  @Delete(':bannerId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a banner. The picture it used is not deleted' })
  @ApiNoContentResponse()
  remove(
    @Param('storeSlug') storeSlug: string,
    @Param('bannerId') bannerId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    return this.banners.remove(storeSlug, current.id, bannerId);
  }
}
