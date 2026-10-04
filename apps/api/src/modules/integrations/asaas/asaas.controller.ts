// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBadGatewayResponse, ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { AsaasConnection } from '@harness-monorepo/contracts';

// App
import { env } from '../../../shared/config/env.js';
import type { AuthenticatedUser } from '../../auth/auth.decorators.js';
import { CurrentUser } from '../../auth/auth.decorators.js';
import { AsaasConnectionService } from './asaas-connection.service.js';
import { AsaasConnectDto } from './dto/asaas.dto.js';
import { AsaasConnectionResponse } from './dto/asaas.response.js';

/** Connecting presents a credential: unlimited, it would let anyone signed in test leaked keys against Asaas from bee-link's address. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

/** A shop's Asaas account (BEELINK-202), as its owner connects it with an API key. Closed, like every panel route. */
@ApiTags('integrations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/integrations/asaas')
export class AsaasController {
  constructor(private readonly asaas: AsaasConnectionService) {}

  @Get()
  @ApiOperation({ summary: "The shop's Asaas connection — whose account and the webhook's state, never the key" })
  @ApiOkResponse({ type: AsaasConnectionResponse })
  connection(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<AsaasConnection> {
    return this.asaas.connection(storeSlug, current.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "Connect with the shop's API key, or replace the one connected: the key is checked, sealed, and the webhook registered at the account" })
  @ApiOkResponse({ type: AsaasConnectionResponse })
  @ApiBadRequestResponse({ description: 'INTEGRATION_KEY_INVALID, INTEGRATION_KEY_WRONG_ENVIRONMENT' })
  @ApiBadGatewayResponse({ description: 'INTEGRATION_UNREACHABLE' })
  @ApiServiceUnavailableResponse({ description: 'INTEGRATION_UNAVAILABLE' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts from this address' })
  connect(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: AsaasConnectDto): Promise<AsaasConnection> {
    return this.asaas.connect(storeSlug, current.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Disconnect: the webhook is removed from the shop's account, and the key deleted" })
  @ApiNoContentResponse()
  disconnect(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<void> {
    return this.asaas.disconnect(storeSlug, current.id);
  }
}
