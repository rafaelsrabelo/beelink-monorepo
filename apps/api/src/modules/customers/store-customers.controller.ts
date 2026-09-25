// Nest
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { CurrentUser } from '../auth/auth.decorators.js';
import { ListStoreCustomersDto } from './dto/store-customer.dto.js';
import { StoreCustomerPageResponse } from './dto/store-customer.response.js';
import { StoreCustomersService } from './store-customers.service.js';

/**
 * The owner's side of the shoppers: who opened an account at the shop. Closed, like every panel
 * route — the global guard takes the shopkeeper's token and refuses a shopper's.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/customers')
export class StoreCustomersController {
  constructor(private readonly customers: StoreCustomersService) {}

  @Get()
  @ApiOperation({ summary: "One page of the shop's customers, newest first" })
  @ApiOkResponse({ type: StoreCustomerPageResponse })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: ListStoreCustomersDto,
  ): Promise<StoreCustomerPageResponse> {
    return this.customers.list(storeSlug, current.id, query);
  }
}
