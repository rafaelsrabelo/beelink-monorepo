// Nest
import { Controller, Get, Param, Query } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

// App
import { Public } from '../auth/auth.decorators.js';
import { STOREFRONT_RATE_LIMIT } from '../stores/stores.constants.js';
import { StoresService } from '../stores/stores.service.js';
import type { PublicProduct } from '@harness-monorepo/contracts';
import { PublicProductResponse, StorefrontCatalogResponse } from './dto/catalog.response.js';
import { ProductCategoriesService } from './product-categories.service.js';
import { ProductsService } from './products.service.js';

/**
 * What an anonymous visitor is served, and no more.
 *
 * A separate path from `stores/:storeSlug/products`, which is the shopkeeper's. Two controllers on
 * one path with different guards is the arrangement where a `@Public()` added in the wrong place
 * quietly opens the other one — keeping them apart means the mistake cannot be made.
 *
 * Every route is `@Public()` on purpose and reads nothing about who is asking. The web app caches
 * these answers and serves them as HTML to people and crawlers alike, so an answer that varied by
 * visitor would be one visitor's answer handed to the next.
 */
@ApiTags('storefront')
@Controller('stores/:storeSlug/catalog')
export class StorefrontController {
  constructor(
    private readonly stores: StoresService,
    private readonly products: ProductsService,
    private readonly categories: ProductCategoriesService,
  ) {}

  @Get()
  @Public()
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiQuery({ name: 'categoria', required: false, description: "A category's slug" })
  @ApiQuery({ name: 'busca', required: false, description: 'Matched against name and description' })
  @ApiOperation({ summary: "A shop's published catalogue, filtered as the window asks" })
  @ApiOkResponse({ type: StorefrontCatalogResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  async catalog(
    @Param('storeSlug') storeSlug: string,
    @Query('categoria') category?: string,
    @Query('busca') search?: string,
  ): Promise<StorefrontCatalogResponse> {
    const storeId = await this.stores.publicStoreId(storeSlug);

    // The categories are the ones the shop has, never the ones this filter left — a window whose
    // navigation disappears when you use it is a window you cannot get back out of.
    const [categories, products] = await Promise.all([
      this.categories.listPublic(storeId),
      this.products.listPublic(storeId, { category, search }),
    ]);

    return { categories, products };
  }

  @Get(':productSlug')
  @Public()
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: 'One product, as its own page shows it' })
  @ApiOkResponse({ type: PublicProductResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND or PRODUCT_NOT_FOUND' })
  async product(
    @Param('storeSlug') storeSlug: string,
    @Param('productSlug') productSlug: string,
  ): Promise<PublicProduct> {
    const storeId = await this.stores.publicStoreId(storeSlug);

    return this.products.publicBySlug(storeId, productSlug);
  }
}
