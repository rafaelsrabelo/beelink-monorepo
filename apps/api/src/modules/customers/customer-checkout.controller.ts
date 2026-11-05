// Nest
import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiAcceptedResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';

// Types
import type { AuthSession, CustomerCheckoutAnswer } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { EmailDto } from '../auth/dto/auth.dto.js';
import { AuthSessionResponse } from '../auth/dto/auth.response.js';
import { CustomerCheckoutService } from './customer-checkout.service.js';
import { CustomerCheckoutAnswerResponse, CustomerCheckoutCodeDto, CustomerCheckoutDto } from './dto/customer-checkout.dto.js';

/** Keyed by IP, as the account door is: it opens accounts and answers whether an e-mail has one. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

/**
 * The checkout's own door: who is buying, without a sign-up. `@Public()`, since nobody is signed in
 * yet. Unlike the account door beside it, it is closed to a page locked for want of payment
 * (BEELINK-223): it exists to place an order, and a locked shop window takes none.
 */
@ApiTags('customers')
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
@Public()
@Controller('stores/:storeSlug/customer/checkout')
export class CustomerCheckoutController {
  constructor(private readonly checkout: CustomerCheckoutService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "Who is buying: an e-mail the shop does not know opens its account and signs it in; one it knows is e-mailed a code" })
  @ApiOkResponse({ type: CustomerCheckoutAnswerResponse })
  @ApiBadRequestResponse({ description: 'A name, an e-mail or a WhatsApp that is not one' })
  identify(@Param('storeSlug') storeSlug: string, @Body() dto: CustomerCheckoutDto, @Headers('user-agent') userAgent?: string): Promise<CustomerCheckoutAnswer> {
    return this.checkout.identify(storeSlug, dto, userAgent);
  }

  @Post('code/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'Another code for the account the checkout found; the same 202 for any e-mail' })
  @ApiAcceptedResponse({ description: 'Sent, unless one went within the minute — or no account, and nothing said' })
  async resend(@Param('storeSlug') storeSlug: string, @Body() dto: EmailDto): Promise<void> {
    await this.checkout.resendCode(storeSlug, dto.email);
  }

  @Post('code')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'The code e-mailed by the checkout, for the session of the account it went to' })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiBadRequestResponse({ description: 'CUSTOMER_CODE_INVALID — wrong, spent, past its ten minutes or tried five times' })
  signIn(@Param('storeSlug') storeSlug: string, @Body() dto: CustomerCheckoutCodeDto, @Headers('user-agent') userAgent?: string): Promise<AuthSession> {
    return this.checkout.signInWithCode(storeSlug, dto, userAgent);
  }
}
