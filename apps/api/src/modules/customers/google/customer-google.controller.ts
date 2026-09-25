// Nest
import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// App
import { env } from '../../../shared/config/env.js';
import { Public } from '../../auth/auth.decorators.js';
import { CustomerGoogleService } from './customer-google.service.js';
import {
  CustomerSignInOptionsResponse,
  GoogleAuthorizationResponse,
  GoogleAuthorizeDto,
  GoogleCallbackDto,
  GoogleSignInResponse,
} from './customer-google.dto.js';

/** Keyed by IP, as the password door is. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

/**
 * A shopper's Google door. The start is per shop; the callback is not — Google sends every shop's
 * shopper back to one fixed address, and the state says which shop the flow began at.
 */
@ApiTags('customers')
@Public()
@Controller()
export class CustomerGoogleController {
  constructor(private readonly google: CustomerGoogleService) {}

  @Get('customer/sign-in-options')
  @ApiOperation({ summary: 'How a shopper may sign in besides e-mail and password' })
  @ApiOkResponse({ type: CustomerSignInOptionsResponse })
  options(): CustomerSignInOptionsResponse {
    return this.google.options();
  }

  @Post('stores/:storeSlug/customer/google/authorize')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "Start a Google sign-in at this shop: Google's address, and the state to hold" })
  @ApiOkResponse({ type: GoogleAuthorizationResponse })
  @ApiNotFoundResponse({ description: 'GOOGLE_SIGN_IN_UNAVAILABLE · STORE_NOT_FOUND' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  authorize(@Param('storeSlug') storeSlug: string, @Body() dto: GoogleAuthorizeDto): Promise<GoogleAuthorizationResponse> {
    return this.google.authorize(storeSlug, dto.returnTo);
  }

  @Post('customer/google/callback')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "Finish a Google sign-in: the shopper's session at the shop it began at" })
  @ApiOkResponse({ type: GoogleSignInResponse })
  @ApiBadRequestResponse({ description: 'GOOGLE_STATE_INVALID · GOOGLE_EXCHANGE_FAILED' })
  @ApiForbiddenResponse({ description: 'GOOGLE_EMAIL_UNVERIFIED' })
  @ApiNotFoundResponse({ description: 'GOOGLE_SIGN_IN_UNAVAILABLE' })
  callback(@Body() dto: GoogleCallbackDto, @Headers('user-agent') userAgent?: string): Promise<GoogleSignInResponse> {
    return this.google.callback(dto.code, dto.state, userAgent);
  }
}
