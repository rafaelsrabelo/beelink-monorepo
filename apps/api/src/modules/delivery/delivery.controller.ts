// Nest
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { DeliverySettings, ShippingQuote } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { DeliveryService } from './delivery.service.js';
import { DeliverySettingsDto } from './dto/delivery.dto.js';
import { DeliverySettingsResponse, ShippingQuoteResponse } from './dto/delivery.response.js';
import { ShippingQuoteDto } from './dto/shipping-quote.dto.js';
import { ShippingQuotes } from './shipping-quote.service.js';

/** The shop's delivery rules (BEELINK-175), as its owner sets them in the panel's Delivery tab, and their quote for a sale it registers (BEELINK-176). */
@ApiTags('delivery')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/delivery')
export class DeliveryController {
  constructor(
    private readonly delivery: DeliveryService,
    private readonly quotes: ShippingQuotes,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Pickup, own delivery by distance bands, and carriers — the defaults until first saved' })
  @ApiOkResponse({ type: DeliverySettingsResponse })
  read(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<DeliverySettings> {
    return this.delivery.settings(storeSlug, current.id);
  }

  @Put()
  @ApiOperation({ summary: 'Save the rules, whole. The bands replace the ones saved before' })
  @ApiOkResponse({ type: DeliverySettingsResponse })
  @ApiBadRequestResponse({ description: 'DELIVERY_SETTINGS_INVALID' })
  save(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: DeliverySettingsDto): Promise<DeliverySettings> {
    return this.delivery.save(storeSlug, current.id, dto);
  }

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The shop's ways to get a sale to an address, as the shop window would quote them — drafts included, for a sale registered here" })
  @ApiOkResponse({ type: ShippingQuoteResponse })
  @ApiBadRequestResponse({ description: 'SHIPPING_DESTINATION_INVALID · ORDER_VARIANT_INVALID · ORDER_ITEM_DUPLICATE' })
  quote(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: ShippingQuoteDto): Promise<ShippingQuote> {
    return this.quotes.forPanel(storeSlug, current.id, dto);
  }
}
