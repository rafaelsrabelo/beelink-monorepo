// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { CustomerSavedAddress } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { CustomerAddressesService } from './customer-addresses.service.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from './customer-auth.guard.js';
import { CurrentCustomer } from './customer.decorators.js';
import { CustomerSavedAddressResponse, SaveCustomerAddressDto } from './dto/customer-address.dto.js';

/**
 * The shopper's saved addresses at a shop. `@Public()` to the global guard, which refuses a
 * shopper's token by design, and closed by `CustomerAuthGuard`, which refuses a shopkeeper's.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · CUSTOMER_ADDRESS_NOT_FOUND' })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/addresses')
export class CustomerAddressesController {
  constructor(private readonly addresses: CustomerAddressesService) {}

  @Get()
  @ApiOperation({ summary: "The shopper's saved addresses at this shop, the default first" })
  @ApiOkResponse({ type: [CustomerSavedAddressResponse] })
  list(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerSavedAddress[]> {
    return this.addresses.list(storeSlug, customer.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Save a new address — the default when it is the first, or when asked' })
  @ApiCreatedResponse({ type: CustomerSavedAddressResponse })
  @ApiBadRequestResponse({ description: 'BAD_REQUEST — a ZIP code, street, city or state missing or malformed' })
  @ApiConflictResponse({ description: 'CUSTOMER_ADDRESS_LIMIT' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: SaveCustomerAddressDto,
  ): Promise<CustomerSavedAddress> {
    return this.addresses.create(storeSlug, customer.userId, dto);
  }

  @Put(':addressId')
  @ApiOperation({ summary: 'Replace every part of one address' })
  @ApiOkResponse({ type: CustomerSavedAddressResponse })
  @ApiBadRequestResponse({ description: 'BAD_REQUEST — a ZIP code, street, city or state missing or malformed' })
  replace(
    @Param('storeSlug') storeSlug: string,
    @Param('addressId') addressId: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: SaveCustomerAddressDto,
  ): Promise<CustomerSavedAddress> {
    return this.addresses.replace(storeSlug, customer.userId, addressId, dto);
  }

  @Delete(':addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove one address; removing the default promotes the one changed last' })
  @ApiNoContentResponse()
  async remove(@Param('storeSlug') storeSlug: string, @Param('addressId') addressId: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<void> {
    await this.addresses.remove(storeSlug, customer.userId, addressId);
  }

  @Post(':addressId/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make one address the default' })
  @ApiOkResponse({ type: CustomerSavedAddressResponse })
  makeDefault(
    @Param('storeSlug') storeSlug: string,
    @Param('addressId') addressId: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
  ): Promise<CustomerSavedAddress> {
    return this.addresses.makeDefault(storeSlug, customer.userId, addressId);
  }
}
