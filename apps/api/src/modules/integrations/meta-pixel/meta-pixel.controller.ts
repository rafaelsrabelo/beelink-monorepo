// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiServiceUnavailableResponse, ApiTooManyRequestsResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { MetaPixelConnection, MetaPixelTestEventResult } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../../auth/auth.decorators.js';
import { CurrentUser } from '../../auth/auth.decorators.js';
import { env } from '../../../shared/config/env.js';
import { MetaPixelConnectDto, MetaPixelTestEventDto, MetaPixelTokenDto } from './dto/meta-pixel.dto.js';
import { MetaPixelConnectionResponse, MetaPixelTestEventResponse } from './dto/meta-pixel.response.js';
import { MetaPixelService } from './meta-pixel.service.js';

/** A test event presents a credential to Meta from bee-link's address: unlimited, anyone signed in could try leaked tokens through it. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

/** A shop's Meta Pixel (BEELINK-269), as its owner saves it by its ID. Closed, like every panel route. */
@ApiTags('integrations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/integrations/meta-pixel')
export class MetaPixelController {
  constructor(private readonly pixel: MetaPixelService) {}

  @Get()
  @ApiOperation({ summary: "The shop's Meta Pixel: its ID and when it was saved, or disconnected" })
  @ApiOkResponse({ type: MetaPixelConnectionResponse })
  connection(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<MetaPixelConnection> {
    return this.pixel.connection(storeSlug, current.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Save the shop's pixel ID, or replace the one saved: digits only, 10 to 20 — never a script. The shop's public data carries it from then on" })
  @ApiOkResponse({ type: MetaPixelConnectionResponse })
  @ApiBadRequestResponse({ description: 'META_PIXEL_ID_INVALID' })
  connect(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: MetaPixelConnectDto): Promise<MetaPixelConnection> {
    return this.pixel.connect(storeSlug, current.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove the shop's pixel: its public data stops carrying an ID" })
  @ApiNoContentResponse()
  disconnect(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<void> {
    return this.pixel.disconnect(storeSlug, current.id);
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Save the pixel's Conversions API access token, or replace the one saved: sealed, never answered back. Meta is asked nothing" })
  @ApiOkResponse({ type: MetaPixelConnectionResponse })
  @ApiBadRequestResponse({ description: 'META_PIXEL_TOKEN_INVALID' })
  @ApiConflictResponse({ description: 'INTEGRATION_NOT_CONNECTED: the shop has no pixel saved' })
  @ApiServiceUnavailableResponse({ description: 'INTEGRATION_UNAVAILABLE: this deployment has no INTEGRATIONS_SECRET_KEY' })
  saveToken(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: MetaPixelTokenDto): Promise<MetaPixelConnection> {
    return this.pixel.saveToken(storeSlug, current.id, dto);
  }

  @Delete('token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove the token and keep the pixel: purchases stop being told from the server' })
  @ApiNoContentResponse()
  removeToken(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<void> {
    return this.pixel.removeToken(storeSlug, current.id);
  }

  @Post('test-event')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "Send one test event to the shop's pixel with its token and the Events Manager's test code, and answer what Meta said. A custom event about nobody: Meta does not drop test events" })
  @ApiOkResponse({ type: MetaPixelTestEventResponse })
  @ApiBadRequestResponse({ description: 'META_PIXEL_TEST_CODE_INVALID' })
  @ApiConflictResponse({ description: 'INTEGRATION_NOT_CONNECTED: no token saved. INTEGRATION_NEEDS_RECONNECT: the token cannot be opened here' })
  @ApiServiceUnavailableResponse({ description: 'INTEGRATION_UNAVAILABLE' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts from this address' })
  testEvent(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: MetaPixelTestEventDto): Promise<MetaPixelTestEventResult> {
    return this.pixel.sendTestEvent(storeSlug, current.id, dto.testEventCode);
  }
}
