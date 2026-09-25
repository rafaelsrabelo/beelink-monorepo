// Nest
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CreateStoreCustomerDto, ListStoreCustomersDto, UpdateStoreCustomerDto } from './dto/store-customer.dto.js';
import { StoreCustomerDetailResponse, StoreCustomerPageResponse, StoreCustomerResponse } from './dto/store-customer.response.js';
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a customer with no account — someone who bought by WhatsApp' })
  @ApiCreatedResponse({ type: StoreCustomerResponse })
  @ApiConflictResponse({ description: 'CUSTOMER_PHONE_TAKEN — the shop already has that phone' })
  create(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CreateStoreCustomerDto,
  ): Promise<StoreCustomerResponse> {
    return this.customers.create(storeSlug, current.id, dto);
  }

  @Get(':customerId')
  @ApiOperation({ summary: "One of the shop's customers, as their record reads them" })
  @ApiOkResponse({ type: StoreCustomerDetailResponse })
  @ApiNotFoundResponse({ description: 'CUSTOMER_NOT_FOUND — no such customer in this shop' })
  findOne(
    @Param('storeSlug') storeSlug: string,
    @Param('customerId') customerId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<StoreCustomerDetailResponse> {
    return this.customers.findOne(storeSlug, current.id, customerId);
  }

  @Patch(':customerId')
  @ApiOperation({ summary: "Correct a customer's name, phone or address; the e-mail is the account's and is not changed here" })
  @ApiOkResponse({ type: StoreCustomerDetailResponse })
  @ApiNotFoundResponse({ description: 'CUSTOMER_NOT_FOUND — no such customer in this shop' })
  @ApiConflictResponse({ description: 'CUSTOMER_PHONE_TAKEN — another customer of the shop has that phone; nothing is saved' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('customerId') customerId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateStoreCustomerDto,
  ): Promise<StoreCustomerDetailResponse> {
    return this.customers.update(storeSlug, current.id, customerId, dto);
  }

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
