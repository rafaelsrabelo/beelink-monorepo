// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { CustomerFavoriteIds, CustomerFavoritePage } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { CustomerFavoriteIdsResponse, CustomerFavoritePageResponse, LikeFavoriteDto, ListCustomerFavoritesDto } from './dto/favorite.dto.js';
import { FavoritesService } from './favorites.service.js';

/**
 * The shopper's favourites at a shop. `@Public()` to the global guard, which refuses a shopper's
 * token by design, and closed by `CustomerAuthGuard`, which refuses a shopkeeper's.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: "A page of the shopper's favourites, priced as of now, with every filter's count" })
  @ApiOkResponse({ type: CustomerFavoritePageResponse })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Query() query: ListCustomerFavoritesDto,
  ): Promise<CustomerFavoritePage> {
    return this.favorites.list(storeSlug, customer.userId, query);
  }

  @Get('ids')
  @ApiOperation({ summary: 'The products the shopper liked, to paint the hearts' })
  @ApiOkResponse({ type: CustomerFavoriteIdsResponse })
  ids(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerFavoriteIds> {
    return this.favorites.ids(storeSlug, customer.userId);
  }

  @Put(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Like a product, or the combination chosen on its page; liking it again changes nothing' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND — a draft, another shop\'s, or none · PRODUCT_VARIANT_NOT_FOUND' })
  @ApiConflictResponse({ description: 'CUSTOMER_FAVORITE_LIMIT' })
  async like(
    @Param('storeSlug') storeSlug: string,
    @Param('productId') productId: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: LikeFavoriteDto,
  ): Promise<void> {
    await this.favorites.like(storeSlug, customer.userId, productId, dto);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a product; one that was not liked answers the same' })
  @ApiNoContentResponse()
  async unlike(@Param('storeSlug') storeSlug: string, @Param('productId') productId: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<void> {
    await this.favorites.unlike(storeSlug, customer.userId, productId);
  }
}
