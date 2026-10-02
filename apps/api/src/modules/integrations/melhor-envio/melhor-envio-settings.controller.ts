// Nest
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { MelhorEnvioAccountOverview, MelhorEnvioSettings } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../../auth/auth.decorators.js';
import { CurrentUser } from '../../auth/auth.decorators.js';
import { MelhorEnvioSettingsDto } from '../dto/melhor-envio.dto.js';
import { MelhorEnvioAccountOverviewResponse, MelhorEnvioSettingsResponse } from '../dto/melhor-envio.response.js';
import { MelhorEnvioSettingsService } from './melhor-envio-settings.service.js';

/** How a shop ships by carrier (BEELINK-183), as its owner sets it in the panel's Integrations. */
@ApiTags('integrations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/integrations/melhor-envio')
export class MelhorEnvioSettingsController {
  constructor(private readonly settings: MelhorEnvioSettingsService) {}

  @Get('account')
  @ApiOperation({ summary: "The wallet's balance and the services Melhor Envio offers, read there and then with the shop's token" })
  @ApiOkResponse({ type: MelhorEnvioAccountOverviewResponse })
  @ApiConflictResponse({ description: 'INTEGRATION_NOT_CONNECTED, INTEGRATION_NEEDS_RECONNECT' })
  @ApiBadGatewayResponse({ description: 'INTEGRATION_UNREACHABLE' })
  account(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<MelhorEnvioAccountOverview> {
    return this.settings.account(storeSlug, current.id);
  }

  @Get('settings')
  @ApiOperation({ summary: 'The services the shop offers, the days it takes to post and its default parcel — the defaults until first saved' })
  @ApiOkResponse({ type: MelhorEnvioSettingsResponse })
  read(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<MelhorEnvioSettings> {
    return this.settings.settings(storeSlug, current.id);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Save the carrier settings, whole' })
  @ApiOkResponse({ type: MelhorEnvioSettingsResponse })
  @ApiBadRequestResponse({ description: 'MELHOR_ENVIO_SETTINGS_INVALID' })
  save(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: MelhorEnvioSettingsDto): Promise<MelhorEnvioSettings> {
    return this.settings.save(storeSlug, current.id, dto);
  }
}
