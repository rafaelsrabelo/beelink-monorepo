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
import { SectionsService } from './sections.service.js';
import { CreateSectionDto, UpdateSectionDto } from './dto/section.dto.js';
import { SectionResponse } from './dto/section.response.js';
import { ReorderDto } from '../catalog/dto/reorder.dto.js';

/**
 * The shop's posters, scoped to one shop by the path.
 *
 * There is no public route here. A visitor never asks for banners on their own — they arrive
 * already resolved on `PublicStore`, which the shop window fetches first and unconditionally, so a
 * second anonymous endpoint would be a second round trip for something already in hand.
 */
@ApiTags('sections')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · SECTION_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/sections')
export class SectionsController {
  constructor(private readonly sections: SectionsService) {}

  @Get()
  @ApiOperation({ summary: "The shop's blocks, hidden ones included, in the order the page draws them" })
  @ApiOkResponse({ type: SectionResponse, isArray: true })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<SectionResponse[]> {
    return this.sections.list(storeSlug, current.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a block. It lands last in the shop’s order' })
  @ApiCreatedResponse({ type: SectionResponse })
  @ApiBadRequestResponse({ description: 'SECTION_TARGET_INVALID' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateSectionDto,
  ): Promise<SectionResponse> {
    return this.sections.create(storeSlug, current.id, dto);
  }

  // Declared above `:sectionId`: Nest matches in declaration order, so the parameter would
  // otherwise swallow `reorder` — the same rule the catalogue's controller follows.
  @Put('reorder')
  @ApiOperation({ summary: 'The whole list, in the new order' })
  @ApiOkResponse({ type: SectionResponse, isArray: true })
  @ApiConflictResponse({ description: 'SECTION_REORDER_MISMATCH' })
  reorder(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ReorderDto,
  ): Promise<SectionResponse[]> {
    return this.sections.reorder(storeSlug, current.id, dto);
  }

  @Put(':sectionId')
  @ApiOperation({ summary: 'A patch. Moving the destination means naming the target with it' })
  @ApiOkResponse({ type: SectionResponse })
  @ApiBadRequestResponse({ description: 'SECTION_TARGET_INVALID' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateSectionDto,
  ): Promise<SectionResponse> {
    return this.sections.update(storeSlug, current.id, sectionId, dto);
  }

  @Delete(':sectionId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a block. The picture it used is not deleted' })
  @ApiNoContentResponse()
  remove(
    @Param('storeSlug') storeSlug: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    return this.sections.remove(storeSlug, current.id, sectionId);
  }
}
