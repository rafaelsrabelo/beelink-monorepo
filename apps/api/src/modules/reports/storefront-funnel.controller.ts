// Nest
import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBadRequestResponse, ApiNoContentResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { FunnelEventDto } from './dto/funnel.dto.js';
import { FunnelService } from './funnel.service.js';

/**
 * Keyed by IP, which only means anything because the API trusts the web app's forwarded address.
 * The address is the limiter's key, in memory, and is written nowhere.
 */
const funnelRateLimit = { max: env.FUNNEL_RATE_LIMIT_MAX, timeWindow: env.FUNNEL_RATE_LIMIT_WINDOW };

/**
 * Where a shop window says a step of its funnel happened (BEELINK-276). Anyone may: it reads
 * nothing about who is asking, and all it can do is raise a day's counter by one.
 *
 * Its own controller on its own path, apart from the owner's `reports` routes: two controllers on
 * one path with different guards is the arrangement where a `@Public()` in the wrong place opens
 * the other one.
 */
@ApiTags('reports')
@Controller('stores/:storeSlug/funnel-events')
export class StorefrontFunnelController {
  constructor(private readonly funnel: FunnelService) {}

  @Post()
  @Public()
  @HttpCode(204)
  @RouteConfig({ rateLimit: funnelRateLimit })
  @ApiOperation({
    summary: "A shop window counts one step of its funnel. Answered 204 whether or not it counted",
    description:
      'Raises by one the counter of that step, at that shop, on today\'s day on the shop\'s clock — in one statement. The body is the step\'s name and nothing else; no cookie, identifier, address or browser is read or kept. ' +
      'A slug that is no shop, and a site that sells nothing, count nothing and are answered the same 204.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'BAD_REQUEST — a step that is none of the four, or any other field' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  count(@Param('storeSlug') storeSlug: string, @Body() dto: FunnelEventDto): Promise<void> {
    return this.funnel.count(storeSlug, dto.step);
  }
}
