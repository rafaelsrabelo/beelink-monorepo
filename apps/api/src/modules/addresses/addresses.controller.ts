// Nest
import { Controller, Get, Query } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// App
import { env } from '../../shared/config/env.js';
import { AddressSearchService } from './address-search.service.js';
import { AddressSuggestionResponse } from './dto/address-suggestion.response.js';

/**
 * Typing produces requests, so this is limited by how fast a person types rather than by how often
 * they save. The web app debounces as well; that is a courtesy to the shopkeeper's connection and
 * this is the one that protects the bill.
 */
const searchRateLimit = { max: env.ADDRESS_SEARCH_RATE_LIMIT_MAX, timeWindow: env.ADDRESS_SEARCH_RATE_LIMIT_WINDOW };

/**
 * `addresses` and not `stores/address-search`: `GET /stores/:slug` would swallow it, which is the
 * same collision RESERVED_SLUGS exists to describe. A separate path has no such argument with
 * itself.
 *
 * No `@Public()`, so the global guard applies. That is the point — see the service's note.
 */
@ApiTags('addresses')
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressSearchService) {}

  @Get('search')
  @ApiBearerAuth()
  @RouteConfig({ rateLimit: searchRateLimit })
  @ApiQuery({ name: 'q', required: true, example: 'Rua Lavras' })
  @ApiOperation({ summary: 'Suggest addresses for what has been typed so far' })
  @ApiOkResponse({ type: [AddressSuggestionResponse] })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many searches from this address' })
  async search(@Query('q') q?: string): Promise<AddressSuggestionResponse[]> {
    // An empty list and not a refusal: nothing to suggest is an ordinary answer, and a panel that
    // has to tell a 400 apart from "no matches" would show an error while someone is still typing.
    const suggestions = await this.addresses.search(q ?? '');

    return suggestions.map(AddressSuggestionResponse.from);
  }

}
