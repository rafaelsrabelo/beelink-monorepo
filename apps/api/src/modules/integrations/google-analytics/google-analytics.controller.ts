// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { GoogleAnalyticsConnection } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../../auth/auth.decorators.js';
import { CurrentUser } from '../../auth/auth.decorators.js';
import { GoogleAnalyticsConnectDto } from './dto/google-analytics.dto.js';
import { GoogleAnalyticsConnectionResponse } from './dto/google-analytics.response.js';
import { GoogleAnalyticsService } from './google-analytics.service.js';

/** A shop's Google Analytics (BEELINK-301), as its owner saves it by its measurement ID. Closed, like every panel route. */
@ApiTags('integrations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/integrations/google-analytics')
export class GoogleAnalyticsController {
  constructor(private readonly analytics: GoogleAnalyticsService) {}

  @Get()
  @ApiOperation({ summary: "The shop's Google Analytics: its measurement ID and when it was saved, or disconnected" })
  @ApiOkResponse({ type: GoogleAnalyticsConnectionResponse })
  connection(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<GoogleAnalyticsConnection> {
    return this.analytics.connection(storeSlug, current.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Save the shop's GA4 measurement ID, or replace the one saved: G- and capital letters or digits — never a script, a UA-, a GTM- or an AW- ID. The shop's public data carries it from then on" })
  @ApiOkResponse({ type: GoogleAnalyticsConnectionResponse })
  @ApiBadRequestResponse({ description: 'GOOGLE_ANALYTICS_ID_INVALID' })
  connect(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: GoogleAnalyticsConnectDto): Promise<GoogleAnalyticsConnection> {
    return this.analytics.connect(storeSlug, current.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove the shop's Google Analytics: its public data stops carrying an ID" })
  @ApiNoContentResponse()
  disconnect(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<void> {
    return this.analytics.disconnect(storeSlug, current.id);
  }
}
