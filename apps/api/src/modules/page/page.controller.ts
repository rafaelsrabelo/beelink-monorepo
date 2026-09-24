// Nest
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
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
import { PageService } from './page.service.js';
import { AddComponentDto, CreateSectionDto, UpdateComponentDto, UpdateSectionDto } from './dto/page.dto.js';
import { ComponentResponse, SectionResponse } from './dto/page.response.js';
import { ReorderDto } from '../catalog/dto/reorder.dto.js';

/**
 * The bands of a shop's landing page, scoped to one shop by the path.
 *
 * There is no public route here. A visitor never asks for the page's bands on their own — they
 * arrive already resolved on `PublicStore`, which the shop window fetches first and
 * unconditionally, so a second anonymous endpoint would be a second round trip for something
 * already in hand.
 */
@ApiTags('page')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · SECTION_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/sections')
export class SectionsController {
  constructor(private readonly page: PageService) {}

  @Get()
  @ApiOperation({ summary: 'The page, band by band, hidden ones included, in the arranged order' })
  @ApiOkResponse({ type: SectionResponse, isArray: true })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<SectionResponse[]> {
    return this.page.list(storeSlug, current.id);
  }

  @Post()
  @ApiOperation({ summary: 'A band and the component it is built around, where position says, or last' })
  @ApiCreatedResponse({ type: SectionResponse })
  @ApiBadRequestResponse({ description: 'COMPONENT_ITEMS_INVALID' })
  @ApiConflictResponse({ description: 'COMPONENT_KIND_SINGLETON' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateSectionDto,
  ): Promise<SectionResponse> {
    return this.page.createSection(storeSlug, current.id, dto);
  }

  // Declared above `:sectionId`: Nest matches in declaration order, so the parameter would
  // otherwise swallow `reorder` — the same rule the catalogue's controller follows.
  @Put('reorder')
  @ApiOperation({ summary: 'Every band of the page, in the new order' })
  @ApiOkResponse({ type: SectionResponse, isArray: true })
  @ApiConflictResponse({ description: 'REORDER_MISMATCH' })
  reorder(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ReorderDto,
  ): Promise<SectionResponse[]> {
    return this.page.reorderSections(storeSlug, current.id, dto);
  }

  @Put(':sectionId')
  @ApiOperation({ summary: 'A band’s own attributes: its colour, its width, whether it shows' })
  @ApiOkResponse({ type: SectionResponse })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateSectionDto,
  ): Promise<SectionResponse> {
    return this.page.updateSection(storeSlug, current.id, sectionId, dto);
  }

  @Delete(':sectionId')
  @HttpCode(204)
  @ApiOperation({ summary: 'The band and everything in it. The pictures it used are not deleted' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'COMPONENT_REQUIRED — the band holds the shop’s only product list' })
  remove(
    @Param('storeSlug') storeSlug: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    return this.page.removeSection(storeSlug, current.id, sectionId);
  }

  @Post(':sectionId/components')
  @ApiOperation({ summary: 'Add a component to a band, where position says, or last inside it' })
  @ApiCreatedResponse({ type: ComponentResponse })
  @ApiBadRequestResponse({ description: 'COMPONENT_ITEMS_INVALID' })
  @ApiConflictResponse({ description: 'COMPONENT_KIND_SINGLETON' })
  addComponent(
    @Param('storeSlug') storeSlug: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: AddComponentDto,
  ): Promise<ComponentResponse> {
    return this.page.createComponent(storeSlug, current.id, sectionId, dto);
  }

  @Put(':sectionId/components/reorder')
  @ApiOperation({ summary: 'Every component of one band, in the new order' })
  @ApiOkResponse({ type: SectionResponse, isArray: true })
  @ApiConflictResponse({ description: 'REORDER_MISMATCH' })
  reorderComponents(
    @Param('storeSlug') storeSlug: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ReorderDto,
  ): Promise<SectionResponse[]> {
    return this.page.reorderComponents(storeSlug, current.id, sectionId, dto);
  }
}

/**
 * One component, addressed without its band.
 *
 * A separate path and not `/sections/:id/components/:id`, because a component's id is enough to
 * find it and nesting would make every edit carry a band id the editor would have to keep in step
 * — the exact bookkeeping that put a slide id where a section id belonged and had a form showing
 * one thing while the page showed another.
 */
@ApiTags('page')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · COMPONENT_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/components')
export class ComponentsController {
  constructor(private readonly page: PageService) {}

  @Patch(':componentId')
  @ApiOperation({ summary: 'A patch. A key left out is a column left alone' })
  @ApiOkResponse({ type: ComponentResponse })
  @ApiBadRequestResponse({ description: 'COMPONENT_ITEMS_INVALID · COMPONENT_KIND_IMMUTABLE' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('componentId') componentId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateComponentDto,
  ): Promise<ComponentResponse> {
    return this.page.updateComponent(storeSlug, current.id, componentId, dto);
  }

  @Delete(':componentId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a component. The band it was in stays' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'COMPONENT_REQUIRED — the shop’s only product list' })
  remove(
    @Param('storeSlug') storeSlug: string,
    @Param('componentId') componentId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    return this.page.removeComponent(storeSlug, current.id, componentId);
  }
}
