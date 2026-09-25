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
import type { StorefrontCartProducts } from '@harness-monorepo/contracts';
import { StorefrontCartProductsResponse } from './dto/variant.response.js';
import { ProductsService } from './products.service.js';

/** The most lines a cart holds (the web's cookie keeps fifty), so the most products one asks for. */
export const CART_MAX_PRODUCTS = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The products a visitor's cart names. The cart itself lives in the visitor's browser — a cookie of
 * ids and quantities — so nothing here knows whose cart it is: it answers "what are these products
 * now", which is the same answer for everyone and is cached like the rest of the catalogue.
 *
 * A GET with the ids in the address rather than a POST with a body, for that reason: the web's
 * public read path caches by address, and a quote is a read.
 */
@ApiTags('storefront')
@Controller('stores/:storeSlug/cart')
export class StorefrontCartController {
  constructor(
    private readonly stores: StoresService,
    private readonly products: ProductsService,
  ) {}

  @Get()
  @Public()
  @RouteConfig({ rateLimit: STOREFRONT_RATE_LIMIT })
  @ApiQuery({
    name: 'produto',
    required: false,
    isArray: true,
    description: `A product id, repeatable. At most ${CART_MAX_PRODUCTS}; anything that is not an id is ignored.`,
  })
  @ApiOperation({ summary: 'The products a cart names, as their pages show them' })
  @ApiOkResponse({ type: StorefrontCartProductsResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  async cartProducts(
    @Param('storeSlug') storeSlug: string,
    @Query('produto') asked?: string | string[],
  ): Promise<StorefrontCartProducts> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    // The address is the visitor's to edit: a malformed id is dropped rather than handed to a uuid
    // column that would answer it with a 500, and the ceiling keeps one address from asking a shop
    // for its whole catalogue.
    const ids = [...new Set([asked ?? []].flat())].filter((id) => UUID.test(id)).slice(0, CART_MAX_PRODUCTS);

    return { products: ids.length ? await this.products.publicByIds(storeId, ids) : [] };
  }
}
