// Nest
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
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
import { ProductVariantsService } from './product-variants.service.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { ReplaceProductOptionsDto } from './dto/product-options.dto.js';
import { UpdateProductVariantsDto } from './dto/product-variants.dto.js';
import { ProductPageResponse, ProductResponse } from './dto/catalog.response.js';
import { ProductDetailResponse } from './dto/variant.response.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { ReorderDto } from './dto/reorder.dto.js';

@ApiTags('catalog')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly variants: ProductVariantsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "One page of the shop's products, drafts included, in the chosen order" })
  @ApiOkResponse({ type: ProductPageResponse })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    // A DTO and not seven `@Query()` parameters: the allowed values live in one place that the
    // global ValidationPipe already refuses anything outside of, so `?status=SOLD` is a 400 before
    // the handler runs rather than a filter that silently matched nothing.
    @Query() query: ListProductsDto,
  ): Promise<ProductPageResponse> {
    return this.products.list(storeSlug, current.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Add a product. Money is whole cents' })
  @ApiCreatedResponse({ type: ProductDetailResponse })
  @ApiBadRequestResponse({ description: 'CATALOG_SLUG_RESERVED · CATALOG_SLUG_EMPTY · CATALOG_PRICE_INVALID' })
  @ApiConflictResponse({ description: 'PRODUCT_SLUG_TAKEN · PRODUCT_SKU_TAKEN' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateProductDto,
  ): Promise<ProductDetailResponse> {
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
  @ApiOperation({ summary: 'One product, as its owner edits it, with its options and variants' })
  @ApiOkResponse({ type: ProductDetailResponse })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND' })
  byId(
    @Param('storeSlug') storeSlug: string,
    @Param('productId') productId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<ProductDetailResponse> {
    return this.products.byId(storeSlug, productId, current.id);
  }

  @Put(':productId')
  @ApiOperation({ summary: 'Edit a product. Sending images replaces the gallery; omitting it leaves it' })
  @ApiOkResponse({ type: ProductDetailResponse })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND · PRODUCT_CATEGORY_NOT_FOUND' })
  @ApiBadRequestResponse({ description: 'CATALOG_SLUG_RESERVED · CATALOG_PRICE_INVALID' })
  @ApiConflictResponse({ description: 'PRODUCT_SLUG_TAKEN · PRODUCT_SKU_TAKEN · PRODUCT_HAS_OPTIONS' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('productId') productId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductDetailResponse> {
    return this.products.update(storeSlug, productId, current.id, dto);
  }

  @Put(':productId/options')
  @ApiOperation({
    summary: 'Replace the options, whole and in order',
    description:
      'A combination that still exists keeps its variant, price, stock and code. A new option extends every ' +
      'variant with its first value; a new combination takes the price of the variant closest to it. A ' +
      'variant whose combination is gone is archived, never deleted, and releases its code.',
  })
  @ApiOkResponse({ type: ProductDetailResponse })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND · PRODUCT_OPTION_NOT_FOUND' })
  @ApiBadRequestResponse({
    description: 'PRODUCT_OPTION_DUPLICATE · PRODUCT_VARIANTS_LIMIT · BAD_REQUEST (more than 3 options, an option with no value)',
  })
  replaceOptions(
    @Param('storeSlug') storeSlug: string,
    @Param('productId') productId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ReplaceProductOptionsDto,
  ): Promise<ProductDetailResponse> {
    return this.variants.replaceOptions(storeSlug, productId, current.id, dto);
  }

  @Put(':productId/variants')
  @ApiOperation({ summary: 'Edit several variants at once. Variants not listed are left as they are' })
  @ApiOkResponse({ type: ProductDetailResponse })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND · PRODUCT_VARIANT_NOT_FOUND' })
  @ApiBadRequestResponse({
    description: 'CATALOG_PRICE_INVALID · CATALOG_PARCEL_INCOMPLETE · BAD_REQUEST (a negative price, more than 100 variants)',
  })
  @ApiConflictResponse({ description: 'PRODUCT_SKU_TAKEN' })
  updateVariants(
    @Param('storeSlug') storeSlug: string,
    @Param('productId') productId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateProductVariantsDto,
  ): Promise<ProductDetailResponse> {
    return this.variants.updateVariants(storeSlug, productId, current.id, dto);
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
