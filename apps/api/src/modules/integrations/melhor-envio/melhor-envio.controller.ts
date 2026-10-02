// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBadGatewayResponse, ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { IntegrationAuthorization, MelhorEnvioConnected, MelhorEnvioConnection } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../../auth/auth.decorators.js';
import { CurrentUser } from '../../auth/auth.decorators.js';
import { MelhorEnvioCallbackDto } from '../dto/melhor-envio.dto.js';
import { IntegrationAuthorizationResponse, MelhorEnvioConnectedResponse, MelhorEnvioConnectionResponse } from '../dto/melhor-envio.response.js';
import { MelhorEnvioService } from './melhor-envio.service.js';

/** A shop's Melhor Envio account (BEELINK-182), as its owner connects it. Closed, like every panel route. */
@ApiTags('integrations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/integrations/melhor-envio')
export class MelhorEnvioController {
  constructor(private readonly melhorEnvio: MelhorEnvioService) {}

  @Get()
  @ApiOperation({ summary: "The shop's connection, and whether one can be made on this deployment" })
  @ApiOkResponse({ type: MelhorEnvioConnectionResponse })
  connection(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<MelhorEnvioConnection> {
    return this.melhorEnvio.connection(storeSlug, current.id);
  }

  @Post('authorize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Begin connecting: Melhor Envio's authorization page, with a state for this person and shop that lasts ten minutes" })
  @ApiOkResponse({ type: IntegrationAuthorizationResponse })
  @ApiServiceUnavailableResponse({ description: 'INTEGRATION_UNAVAILABLE' })
  authorize(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<IntegrationAuthorization> {
    return this.melhorEnvio.authorize(storeSlug, current.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect: the tokens are deleted' })
  @ApiNoContentResponse()
  disconnect(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<void> {
    return this.melhorEnvio.disconnect(storeSlug, current.id);
  }
}

/**
 * Where the web hands over what Melhor Envio sent the browser back with. No shop in the path: the
 * one return address serves every shop, and the state says which — for the person who began it only.
 */
@ApiTags('integrations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@Controller('integrations/melhor-envio')
export class MelhorEnvioCallbackController {
  constructor(private readonly melhorEnvio: MelhorEnvioService) {}

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finish connecting: the code traded for the tokens, sealed, and the account read' })
  @ApiOkResponse({ type: MelhorEnvioConnectedResponse })
  @ApiBadRequestResponse({ description: 'INTEGRATION_STATE_INVALID, INTEGRATION_EXCHANGE_FAILED' })
  @ApiBadGatewayResponse({ description: 'INTEGRATION_UNREACHABLE' })
  @ApiServiceUnavailableResponse({ description: 'INTEGRATION_UNAVAILABLE' })
  callback(@CurrentUser() current: AuthenticatedUser, @Body() dto: MelhorEnvioCallbackDto): Promise<MelhorEnvioConnected> {
    return this.melhorEnvio.callback(current.id, dto);
  }
}
