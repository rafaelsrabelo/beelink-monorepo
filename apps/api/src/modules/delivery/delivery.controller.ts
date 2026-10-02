// Nest
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { DeliverySettings } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { DeliveryService } from './delivery.service.js';
import { DeliverySettingsDto } from './dto/delivery.dto.js';
import { DeliverySettingsResponse } from './dto/delivery.response.js';

/** The shop's delivery rules (BEELINK-175), as its owner sets them in the panel's Delivery tab. */
@ApiTags('delivery')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/delivery')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

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
}
