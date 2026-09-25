// Nest
import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { AuthSession, CustomerProfile } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { EmailDto, LoginDto, LogoutDto, RefreshDto, RegisterDto } from '../auth/dto/auth.dto.js';
import { AuthSessionResponse } from '../auth/dto/auth.response.js';
import { SessionService } from '../auth/session.service.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from './customer-auth.guard.js';
import { CurrentCustomer } from './customer.decorators.js';
import { CustomersService } from './customers.service.js';
import { CustomerProfileResponse, UpdateCustomerProfileDto } from './dto/customer.dto.js';

/** Keyed by IP, as the panel's door is: the same accounts, the same guessing to slow down. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

/**
 * A shopper's door into a shop. `@Public()` to the global guard — which refuses a shopper's token by
 * design — and closed where it has to be by `CustomerAuthGuard`, which refuses a shopkeeper's.
 */
@ApiTags('customers')
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@Public()
@Controller('stores/:storeSlug/customer')
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'Open an account from this shop and send the verification e-mail — 202 for any address' })
  @ApiAcceptedResponse({ description: 'Answered alike whether the address is new or already has an account' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  async register(@Param('storeSlug') storeSlug: string, @Body() dto: RegisterDto): Promise<void> {
    await this.customers.register(storeSlug, dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'Send the verification e-mail again, back to this shop — 202 for any address' })
  async resendVerification(@Param('storeSlug') storeSlug: string, @Body() { email }: EmailDto): Promise<void> {
    await this.customers.resendVerification(storeSlug, email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "Open a shopper's session at this shop" })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_INVALID_CREDENTIALS' })
  @ApiForbiddenResponse({ description: 'AUTH_EMAIL_NOT_VERIFIED' })
  login(
    @Param('storeSlug') storeSlug: string,
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthSession> {
    return this.customers.login(storeSlug, dto, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate a shopper's refresh token; a shopkeeper's is invalid here" })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_TOKEN_INVALID or AUTH_REFRESH_REUSED' })
  refresh(@Body() { refreshToken }: RefreshDto): Promise<AuthSession> {
    return this.sessions.refresh(refreshToken, 'CUSTOMER');
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "End a shopper's session on this device" })
  async logout(@Body() { refreshToken }: LogoutDto): Promise<void> {
    await this.sessions.revokeByRefreshToken(refreshToken);
  }

  @Get('me')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "The shopper's record at this shop, made on first use" })
  @ApiOkResponse({ type: CustomerProfileResponse })
  @ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, or a shopkeeper's" })
  me(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerProfile> {
    return this.customers.me(storeSlug, customer.userId);
  }

  @Patch('me')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the shopper's name, phone or address at this shop" })
  @ApiOkResponse({ type: CustomerProfileResponse })
  @ApiConflictResponse({ description: 'CUSTOMER_PHONE_TAKEN' })
  update(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfile> {
    return this.customers.update(storeSlug, customer.userId, dto);
  }
}
