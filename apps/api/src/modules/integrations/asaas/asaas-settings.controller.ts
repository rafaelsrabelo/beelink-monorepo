// Nest
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { AsaasSettings } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../../auth/auth.decorators.js';
import { CurrentUser } from '../../auth/auth.decorators.js';
import { AsaasSettingsService } from './asaas-settings.service.js';
import { AsaasSettingsDto } from './dto/asaas.dto.js';
import { AsaasSettingsResponse } from './dto/asaas.response.js';

/** How a shop is paid through Asaas (BEELINK-203), as its owner sets it in the panel's Integrations. */
@ApiTags('integrations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/integrations/asaas/settings')
export class AsaasSettingsController {
  constructor(private readonly settings: AsaasSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Pix, credit card and its instalments, paying on delivery — the defaults until first saved, connected or not' })
  @ApiOkResponse({ type: AsaasSettingsResponse })
  read(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<AsaasSettings> {
    return this.settings.settings(storeSlug, current.id);
  }

  @Put()
  @ApiOperation({ summary: 'Save how the shop is paid, whole' })
  @ApiOkResponse({ type: AsaasSettingsResponse })
  @ApiBadRequestResponse({ description: 'ASAAS_SETTINGS_INVALID' })
  save(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: AsaasSettingsDto): Promise<AsaasSettings> {
    return this.settings.save(storeSlug, current.id, dto);
  }
}
