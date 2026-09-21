// Nest
import { Controller, Get, Header, NotFoundException, Query, StreamableFile } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
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
/** Keeps every code this module answers inside the set the web has a sentence for. */
function addressError(errorCode: 'BAD_REQUEST', message: string): { errorCode: string; message: string } {
  return { errorCode, message };
}

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

  /**
   * The picture of a point, as bytes. The key is in the address this is built from, so the address
   * never leaves this process — a map URL handed to a browser is a key handed to every browser.
   *
   * Cached hard at the edge and not at all on our side. MapTiler's terms allow a stored geocoding
   * result and forbid "map content from a server-side cache", and a browser holding a picture it
   * asked for is neither: it is the cache their own terms describe as a temporary personal one.
   */
  @Get('map')
  @ApiBearerAuth()
  @RouteConfig({ rateLimit: searchRateLimit })
  @Header('content-type', 'image/png')
  @Header('cache-control', 'private, max-age=86400')
  @ApiQuery({ name: 'lat', required: true, example: -3.7436 })
  @ApiQuery({ name: 'lon', required: true, example: -38.4998 })
  @ApiOperation({ summary: 'A static map centred on a point, with a marker on it' })
  @ApiOkResponse({ description: 'A PNG' })
  @ApiNotFoundResponse({ description: 'No map: uploads not configured, or the point is not one' })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  async map(@Query('lat') lat?: string, @Query('lon') lon?: string): Promise<StreamableFile> {
    const point = toPoint(lat, lon);

    // 404 and not 400 for a point that is not one: what the caller asked for does not exist, and
    // an `<img>` shows the same broken picture either way. The distinction only matters to a log.
    if (!point) throw new NotFoundException(addressError('BAD_REQUEST', 'lat and lon must be coordinates'));

    const drawn = await this.addresses.map(point);
    if (!drawn) throw new NotFoundException(addressError('BAD_REQUEST', 'No map for that point'));

    return new StreamableFile(drawn.bytes, { type: drawn.contentType });
  }
}

/**
 * Both numbers, both in range, or nothing. A latitude of 200 is not a place, and passing it
 * through would spend a request to be told so by the provider.
 */
export function toPoint(lat?: string, lon?: string): { latitude: number; longitude: number } | null {
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!lat || !lon || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  return { latitude, longitude };
}
