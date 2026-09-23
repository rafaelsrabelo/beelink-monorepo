// Nest
import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { CreateLeadDto } from './dto/lead.dto.js';
import { LeadsService } from './leads.service.js';

/**
 * Keyed by IP, which only means anything because the API trusts the web app's forwarded address.
 * Built here and not in `leads.constants.ts`, for the reason stores.controller.ts gives.
 */
const leadRateLimit = { max: env.LEAD_RATE_LIMIT_MAX, timeWindow: env.LEAD_RATE_LIMIT_WINDOW };

/**
 * The one write a stranger can make: sending a site's contact form.
 *
 * Its own controller on its own path, apart from the owner's `leads` routes, for the reason the
 * catalogue keeps its public read apart from the shopkeeper's: two controllers on one path with
 * different guards is the arrangement where a `@Public()` in the wrong place opens the other one.
 */
@ApiTags('leads')
@Controller('stores/:storeSlug/contact')
export class ContactController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @Public()
  @HttpCode(204)
  @RouteConfig({ rateLimit: leadRateLimit })
  @ApiOperation({ summary: "A visitor sends a site's contact form. Answered 204 whether saved or trapped" })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'LEAD_ANSWER_INVALID — the message names the field' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · LEAD_FORM_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  receive(@Param('storeSlug') storeSlug: string, @Body() dto: CreateLeadDto): Promise<void> {
    return this.leads.receive(storeSlug, dto);
  }
}
