// Nest
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { CourierApplicationsService } from './courier-applications.service.js';
import { CourierApplicationDto } from './dto/courier-application.dto.js';

/**
 * Keyed by IP, which only means anything because the API trusts the web app's forwarded address.
 * Built here and not in `couriers.constants.ts`, for the reason stores.controller.ts gives.
 */
const applicationRateLimit = {
  max: env.COURIER_APPLICATION_RATE_LIMIT_MAX,
  timeWindow: env.COURIER_APPLICATION_RATE_LIMIT_WINDOW,
};

/**
 * Where a person says they want to deliver with Beelink (BEELINK-321): the landing's form.
 *
 * Anyone may write here, so the route is all there is on this path — no read sits beside it for a
 * `@Public()` in the wrong place to open. The body carries a CPF, an e-mail and a phone: nothing of
 * it is logged, here or below.
 */
@ApiTags('couriers')
@Controller('courier-applications')
export class CourierApplicationsController {
  constructor(private readonly applications: CourierApplicationsService) {}

  @Post()
  @Public()
  @HttpCode(204)
  @RouteConfig({ rateLimit: applicationRateLimit })
  @ApiOperation({
    summary: 'A person asks to deliver with Beelink. Answered 204 when kept, or trapped',
    description:
      'A person is on the list once. A CPF, an e-mail or a WhatsApp number already there is a 409 that names which, and the row it belongs to is left as it was. ' +
      'The version of the terms recorded is the one in force on the server. An application kept is owed one e-mail, to its address, saying it arrived (BEELINK-326): ' +
      'it leaves after the answer, and one that does not go changes no answer here. A 409, the trap and a refusal owe none. Nothing is read back.',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description:
      'COURIER_NAME_INVALID · COURIER_DOCUMENT_INVALID · COURIER_EMAIL_INVALID · COURIER_WHATSAPP_INVALID · COURIER_CITY_NOT_OPEN · COURIER_VEHICLE_INVALID · COURIER_TERMS_REQUIRED — the first field refused, in that order. BAD_REQUEST for a field the route does not know',
  })
  @ApiConflictResponse({
    description: 'COURIER_DOCUMENT_TAKEN · COURIER_EMAIL_TAKEN · COURIER_WHATSAPP_TAKEN — the first of the three already on the list, in that order',
  })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  receive(@Body() dto: CourierApplicationDto): Promise<void> {
    return this.applications.receive(dto);
  }
}
