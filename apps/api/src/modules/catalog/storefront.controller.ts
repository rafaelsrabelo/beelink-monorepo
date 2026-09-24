// Nest
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
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
import type { PublicProductDetail } from '@harness-monorepo/contracts';
import { PRODUCTS_PAGE_SIZE, PRODUCTS_PAGE_SIZE_MAX } from './catalog.constants.js';
import { StorefrontCatalogResponse } from './dto/catalog.response.js';
import { PublicProductDetailResponse } from './dto/variant.response.js';
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
  @ApiQuery({
    name: 'pagina',
    required: false,
    schema: { type: 'integer', minimum: 1, default: 1 },
    description: '1-based. Below the first page is served as the first page, not refused.',
  })
  @ApiQuery({
    name: 'porPagina',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: PRODUCTS_PAGE_SIZE_MAX,
      default: PRODUCTS_PAGE_SIZE,
    },
    description: `At most ${PRODUCTS_PAGE_SIZE_MAX}; a larger ask is served at the ceiling.`,
  })
  @ApiOperation({ summary: "A shop's published catalogue, filtered and paged as the window asks" })
  @ApiOkResponse({ type: StorefrontCatalogResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  async catalog(
    @Param('storeSlug') storeSlug: string,
    @Query('categoria') category?: string,
    @Query('busca') search?: string,
    // An integer or nothing: `pagina=abc` is a mistake the pipe answers 400 to before the handler
    // runs. A number out of range is bounded below instead, because this is the indexed read path
    // and a crawler following a hand-edited `?pagina=0` should land on a page rather than an error.
    @Query('pagina', new ParseIntPipe({ optional: true })) askedPage?: number,
    @Query('porPagina', new ParseIntPipe({ optional: true })) askedPageSize?: number,
  ): Promise<StorefrontCatalogResponse> {
    const storeId = await this.stores.publicStoreId(storeSlug);

    // The ceiling is the point of taking the page size from the URL at all: one address must not be
    // able to ask a shop for its whole catalogue. The answer below echoes the bounds that were
    // used, never the ones that were asked for, so a pager is drawn from what it actually got.
    const page = Math.max(askedPage ?? 1, 1);
    const pageSize = Math.min(Math.max(askedPageSize ?? PRODUCTS_PAGE_SIZE, 1), PRODUCTS_PAGE_SIZE_MAX);

    // The categories are the ones the shop has, never the ones this filter left — a window whose
    // navigation disappears when you use it is a window you cannot get back out of.
    const [categories, { products, total }] = await Promise.all([
      this.categories.listPublic(storeId),
      this.products.listPublic(storeId, { category, search, page, pageSize }),
    ]);

    return { categories, products, total, page, pageSize };
  }

  @Get(':productSlug')
  @Public()
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiOperation({ summary: 'One product, as its own page shows it, with the combinations it sells' })
  @ApiOkResponse({ type: PublicProductDetailResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND or PRODUCT_NOT_FOUND' })
  async product(
    @Param('storeSlug') storeSlug: string,
    @Param('productSlug') productSlug: string,
  ): Promise<PublicProductDetail> {
    const storeId = await this.stores.publicStoreId(storeSlug);

    return this.products.publicBySlug(storeId, productSlug);
  }
}
