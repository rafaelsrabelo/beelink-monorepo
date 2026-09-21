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
import { ProductCategoriesService } from './product-categories.service.js';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/product-category.dto.js';
import { ProductCategoryResponse } from './dto/catalog.response.js';
import { ReorderDto } from './dto/reorder.dto.js';

/**
 * The shopkeeper's own taxonomy, scoped to one shop by the path. Every handler resolves the shop
 * from `:storeSlug` and checks ownership in the service, where the row is already in hand.
 */
@ApiTags('catalog')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/product-categories')
export class ProductCategoriesController {
  constructor(private readonly categories: ProductCategoriesService) {}

  @Get()
  @ApiOperation({ summary: "The shop's categories, hidden ones included, in the chosen order" })
  @ApiOkResponse({ type: ProductCategoryResponse, isArray: true })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<ProductCategoryResponse[]> {
    return this.categories.list(storeSlug, current.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a category — the segment is derived from the name unless one is sent' })
  @ApiCreatedResponse({ type: ProductCategoryResponse })
  @ApiBadRequestResponse({ description: 'CATALOG_SLUG_RESERVED · CATALOG_SLUG_EMPTY' })
  @ApiConflictResponse({ description: 'PRODUCT_CATEGORY_SLUG_TAKEN' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    return this.categories.create(storeSlug, current.id, dto);
  }

  // Declared above `:categoryId`: Nest matches in declaration order, so the parameter would
  // otherwise swallow `reorder` — the same rule `stores.controller.ts` follows for `mine`.
  @Put('reorder')
  @ApiOperation({ summary: 'The whole list, in its new order' })
  @ApiOkResponse({ type: ProductCategoryResponse, isArray: true })
  @ApiConflictResponse({ description: 'CATALOG_REORDER_MISMATCH' })
  reorder(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ReorderDto,
  ): Promise<ProductCategoryResponse[]> {
    return this.categories.reorder(storeSlug, current.id, dto);
  }

  @Put(':categoryId')
  @ApiOperation({ summary: 'Edit a category. A key left out is left alone' })
  @ApiOkResponse({ type: ProductCategoryResponse })
  @ApiNotFoundResponse({ description: 'PRODUCT_CATEGORY_NOT_FOUND' })
  @ApiConflictResponse({ description: 'PRODUCT_CATEGORY_SLUG_TAKEN' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    return this.categories.update(storeSlug, categoryId, current.id, dto);
  }

  @Delete(':categoryId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a category. Its products survive, un-filed' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'PRODUCT_CATEGORY_NOT_FOUND' })
  remove(
    @Param('storeSlug') storeSlug: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    return this.categories.remove(storeSlug, categoryId, current.id);
  }
}
