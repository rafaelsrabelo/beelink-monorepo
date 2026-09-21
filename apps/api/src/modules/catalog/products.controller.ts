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
import { ProductsService } from './products.service.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { ProductResponse } from './dto/catalog.response.js';
import { ReorderDto } from './dto/reorder.dto.js';

@ApiTags('catalog')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "The shop's products, unavailable ones included, in the chosen order" })
  @ApiOkResponse({ type: ProductResponse, isArray: true })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<ProductResponse[]> {
    return this.products.list(storeSlug, current.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a product. Money is whole cents' })
  @ApiCreatedResponse({ type: ProductResponse })
  @ApiBadRequestResponse({ description: 'CATALOG_SLUG_RESERVED · CATALOG_SLUG_EMPTY · CATALOG_PRICE_INVALID' })
  @ApiConflictResponse({ description: 'PRODUCT_SLUG_TAKEN' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ): Promise<ProductResponse> {
    return this.products.create(storeSlug, current.id, dto);
  }

  // Above `:productId`, for the reason product-categories.controller.ts gives.
  @Put('reorder')
  @ApiOperation({ summary: 'The whole list, in its new order' })
  @ApiOkResponse({ type: ProductResponse, isArray: true })
  @ApiConflictResponse({ description: 'CATALOG_REORDER_MISMATCH' })
  reorder(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ReorderDto,
  ): Promise<ProductResponse[]> {
    return this.products.reorder(storeSlug, current.id, dto);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'One product, as its owner edits it' })
  @ApiOkResponse({ type: ProductResponse })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND' })
  byId(
    @Param('storeSlug') storeSlug: string,
    @Param('productId') productId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<ProductResponse> {
    return this.products.byId(storeSlug, productId, current.id);
  }

  @Put(':productId')
  @ApiOperation({ summary: 'Edit a product. Sending images replaces the gallery; omitting it leaves it' })
  @ApiOkResponse({ type: ProductResponse })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND · PRODUCT_CATEGORY_NOT_FOUND' })
  @ApiBadRequestResponse({ description: 'CATALOG_SLUG_RESERVED · CATALOG_PRICE_INVALID' })
  @ApiConflictResponse({ description: 'PRODUCT_SLUG_TAKEN' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('productId') productId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    return this.products.update(storeSlug, productId, current.id, dto);
  }

  @Delete(':productId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a product and its photos' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND' })
  remove(
    @Param('storeSlug') storeSlug: string,
    @Param('productId') productId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    return this.products.remove(storeSlug, productId, current.id);
  }
}
