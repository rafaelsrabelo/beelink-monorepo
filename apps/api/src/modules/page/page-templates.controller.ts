// Nest
import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
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
import { OpeningTemplatesQueryDto, PageTemplatesQueryDto } from './dto/page-templates-query.dto.js';
import { PageTemplateResponse } from './dto/page-templates.response.js';
import { PagePreviewResponse } from './dto/pages.response.js';
import { TemplatePreviewQueryDto } from './dto/template-preview.dto.js';
import { PageTemplatesService } from './page-templates.service.js';

/** The gallery of models a page may be arranged with, and each one's preview, to the shop's owner. Reading only: nothing here writes a page. */
@ApiTags('pages')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PAGE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/page-templates')
export class PageTemplatesController {
  constructor(private readonly templates: PageTemplatesService) {}

  @Get()
  @ApiOperation({
    summary: 'The models this page may be arranged with, the ones suggested for the shop’s category first — the home unless ?pageId=, or a page about to be made with ?kind=',
  })
  @ApiOkResponse({ type: PageTemplateResponse, isArray: true })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: PageTemplatesQueryDto,
  ): Promise<PageTemplateResponse[]> {
    return this.templates.list(storeSlug, current.id, query);
  }

  @Get(':templateId/preview')
  @ApiOperation({ summary: 'A model as it would look on this page — the home unless ?pageId= — drawn from the shop’s own products. Nothing is written' })
  @ApiOkResponse({ type: PagePreviewResponse })
  @ApiBadRequestResponse({
    description:
      'PAGE_TEMPLATE_UNAVAILABLE — not a model, or not one for this kind of store or page · PAGE_PRODUCT_REQUIRED · PAGE_PRODUCT_INVALID · PAGE_CATEGORY_REQUIRED · PAGE_CATEGORY_INVALID',
  })
  preview(
    @Param('storeSlug') storeSlug: string,
    @Param('templateId') templateId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: TemplatePreviewQueryDto,
  ): Promise<PagePreviewResponse> {
    return this.templates.preview(storeSlug, current.id, templateId, query);
  }
}

/**
 * The models a store may open with, asked while it is being created: there is no shop to scope the
 * question by yet, only the type picked in the form. Signed in, like the form itself.
 */
@ApiTags('pages')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@Controller('page-templates')
export class OpeningTemplatesController {
  constructor(private readonly templates: PageTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'The models the home of a new store of this type may open with, the ones suggested for ?categoryId= first' })
  @ApiOkResponse({ type: PageTemplateResponse, isArray: true })
  @ApiBadRequestResponse({ description: 'PAGE_TEMPLATE_UNAVAILABLE — not a type of store' })
  opening(@Query() query: OpeningTemplatesQueryDto): Promise<PageTemplateResponse[]> {
    return this.templates.opening(query);
  }
}
