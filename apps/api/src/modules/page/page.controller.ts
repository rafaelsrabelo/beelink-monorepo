// Nest
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
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
import { PageComponentMovesService } from './page-component-moves.service.js';
import { PageComponentsService } from './page-components.service.js';
import { PAGE_REVISION_DOC, PageRevision } from './page-revision.decorator.js';
import { PageService } from './page.service.js';
import { AddComponentDto, CreateSectionDto, UpdateSectionDto } from './dto/page.dto.js';
import { ComponentResponse, SectionResponse } from './dto/page.response.js';
import { ReorderDto } from '../catalog/dto/reorder.dto.js';
import { PageScopeDto } from './dto/page-scope.dto.js';

/**
 * The bands of a shop's pages, scoped to one shop by the path and to one page by `?pageId=` — the
 * home when it is left out.
 *
 * There is no public route here. A visitor never asks for a page's bands on their own: the home's
 * arrive already resolved on `PublicStore`, which the shop window fetches first and
 * unconditionally, and a landing's arrive with the landing (`PublicLandingsController`).
 */
@ApiTags('page')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · SECTION_NOT_FOUND · PAGE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@ApiHeader(PAGE_REVISION_DOC)
@ApiConflictResponse({ description: 'PAGE_DRAFT_STALE — another tab wrote to this page since this one read it' })
@Controller('stores/:storeSlug/sections')
export class SectionsController {
  constructor(
    private readonly page: PageService,
    private readonly components: PageComponentsService,
    private readonly moves: PageComponentMovesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'A page, band by band, hidden ones included, in the arranged order — the home unless ?pageId=' })
  @ApiOkResponse({ type: SectionResponse, isArray: true })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() scope: PageScopeDto,
  ): Promise<SectionResponse[]> {
    return this.page.list(storeSlug, current.id, scope.pageId);
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
    @Query() scope: PageScopeDto,
    @PageRevision() revision: number | undefined,
  ): Promise<SectionResponse> {
    return this.page.createSection(storeSlug, current.id, dto, scope.pageId, revision);
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
    @Query() scope: PageScopeDto,
    @PageRevision() revision: number | undefined,
  ): Promise<SectionResponse[]> {
    return this.page.reorderSections(storeSlug, current.id, dto, scope.pageId, revision);
  }

  @Put(':sectionId')
  @ApiOperation({ summary: 'A band’s own attributes: its colour, its width, whether it shows' })
  @ApiOkResponse({ type: SectionResponse })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateSectionDto,
    @PageRevision() revision: number | undefined,
  ): Promise<SectionResponse> {
    return this.page.updateSection(storeSlug, current.id, sectionId, dto, revision);
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
    @PageRevision() revision: number | undefined,
  ): Promise<void> {
    return this.page.removeSection(storeSlug, current.id, sectionId, revision);
  }

  @Post(':sectionId/duplicate')
  @ApiOperation({ summary: 'A hidden copy of the band and its blocks, right after it. Unnamed' })
  @ApiCreatedResponse({ type: SectionResponse })
  @ApiConflictResponse({ description: 'COMPONENT_KIND_SINGLETON — the band holds the strip' })
  duplicate(
    @Param('storeSlug') storeSlug: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() current: AuthenticatedUser,
    @PageRevision() revision: number | undefined,
  ): Promise<SectionResponse> {
    return this.page.duplicateSection(storeSlug, current.id, sectionId, revision);
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
    @PageRevision() revision: number | undefined,
  ): Promise<ComponentResponse> {
    return this.components.createComponent(storeSlug, current.id, sectionId, dto, revision);
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
    @PageRevision() revision: number | undefined,
  ): Promise<SectionResponse[]> {
    return this.moves.reorderComponents(storeSlug, current.id, sectionId, dto, revision);
  }
}
