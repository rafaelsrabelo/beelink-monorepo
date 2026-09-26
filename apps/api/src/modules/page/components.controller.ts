// Nest
import { Body, Controller, Delete, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
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
import { UpdateComponentDto } from './dto/page.dto.js';
import { MoveComponentDto } from './dto/move-component.dto.js';
import { ComponentResponse, SectionResponse } from './dto/page.response.js';

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
@ApiHeader(PAGE_REVISION_DOC)
@ApiConflictResponse({ description: 'PAGE_DRAFT_STALE — another tab wrote to this page since this one read it' })
@Controller('stores/:storeSlug/components')
export class ComponentsController {
  constructor(
    private readonly components: PageComponentsService,
    private readonly moves: PageComponentMovesService,
  ) {}

  @Patch(':componentId')
  @ApiOperation({ summary: 'A patch. A key left out is a column left alone' })
  @ApiOkResponse({ type: ComponentResponse })
  @ApiBadRequestResponse({ description: 'COMPONENT_ITEMS_INVALID · COMPONENT_KIND_IMMUTABLE' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('componentId') componentId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateComponentDto,
    @PageRevision() revision: number | undefined,
  ): Promise<ComponentResponse> {
    return this.components.updateComponent(storeSlug, current.id, componentId, dto, revision);
  }

  // A route of its own and not a `sectionId` on the PATCH: a move changes two bands at once, and
  // may delete the one it leaves.
  @Put(':componentId/section')
  @ApiOperation({ summary: 'Move a component into another band, or to another place in its own' })
  @ApiOkResponse({ type: SectionResponse, isArray: true, description: 'The whole page after the move' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · COMPONENT_NOT_FOUND · SECTION_NOT_FOUND' })
  @ApiBadRequestResponse({ description: 'POSITION_INVALID · COMPONENT_SPAN_INVALID' })
  @ApiConflictResponse({ description: 'COMPONENT_NOT_MOVABLE — the strip above the header, or into its band' })
  move(
    @Param('storeSlug') storeSlug: string,
    @Param('componentId') componentId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: MoveComponentDto,
    @PageRevision() revision: number | undefined,
  ): Promise<SectionResponse[]> {
    return this.moves.moveComponent(storeSlug, current.id, componentId, dto, revision);
  }

  @Post(':componentId/duplicate')
  @ApiOperation({ summary: 'A hidden copy of the component, right after it in its band' })
  @ApiCreatedResponse({ type: ComponentResponse })
  @ApiConflictResponse({ description: 'COMPONENT_KIND_SINGLETON — the strip is one per shop' })
  duplicate(
    @Param('storeSlug') storeSlug: string,
    @Param('componentId') componentId: string,
    @CurrentUser() current: AuthenticatedUser,
    @PageRevision() revision: number | undefined,
  ): Promise<ComponentResponse> {
    return this.moves.duplicateComponent(storeSlug, current.id, componentId, revision);
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
    @PageRevision() revision: number | undefined,
  ): Promise<void> {
    return this.components.removeComponent(storeSlug, current.id, componentId, revision);
  }
}
