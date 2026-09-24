// Nest
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

// App
import { Public } from '../auth/auth.decorators.js';
import { RESTOCK_RATE_LIMIT } from './catalog.constants.js';
import { CreateRestockRequestDto } from './dto/restock-request.dto.js';
import { RestockRequestsService } from './restock-requests.service.js';

/**
 * The one catalogue write a stranger can make.
 *
 * Its own controller, and its route is its own, rather than a method on the owner's
 * `ProductsController`: two sets of handlers with different guards behind one class is the
 * arrangement where a `@Public()` in the wrong place opens the shopkeeper's routes.
 */
@ApiTags('catalog')
@Controller('stores/:storeSlug/products/:productId/restock-requests')
export class RestockRequestsController {
  constructor(private readonly requests: RestockRequestsService) {}

  @Post()
  @Public()
  @HttpCode(201)
  @RouteConfig({ rateLimit: RESTOCK_RATE_LIMIT })
  @ApiOperation({ summary: 'A visitor asks to be told when a sold-out combination is back. No body' })
  @ApiCreatedResponse({ description: 'Saved — or trapped, or already asked by this number.' })
  @ApiBadRequestResponse({ description: 'RESTOCK_VARIANT_INVALID · BAD_REQUEST (a phone without area code)' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  receive(
    @Param('storeSlug') storeSlug: string,
    @Param('productId', new ParseUUIDPipe({ errorHttpStatusCode: 400 })) productId: string,
    @Body() dto: CreateRestockRequestDto,
  ): Promise<void> {
    return this.requests.receive(storeSlug, productId, dto);
  }
}
