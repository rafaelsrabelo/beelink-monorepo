// Nest
import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { AuthSession, CustomerNotifications, CustomerProfile } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { LoginDto, LogoutDto, RefreshDto } from '../auth/dto/auth.dto.js';
import { AuthSessionResponse } from '../auth/dto/auth.response.js';
import { SessionService } from '../auth/session.service.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from './customer-auth.guard.js';
import { CurrentCustomer } from './customer.decorators.js';
import { CustomersService } from './customers.service.js';
import { CustomerEmailDto, CustomerRegisterDto } from './dto/customer-link.dto.js';
import { CustomerNotificationsResponse, UpdateCustomerNotificationsDto } from './dto/customer-notifications.dto.js';
import { ChangeCustomerPasswordDto, CustomerPasswordLinkDto } from './dto/customer-password.dto.js';
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
  async register(@Param('storeSlug') storeSlug: string, @Body() dto: CustomerRegisterDto): Promise<void> {
    await this.customers.register(storeSlug, dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'Send the verification e-mail again, back to this shop — 202 for any address' })
  async resendVerification(@Param('storeSlug') storeSlug: string, @Body() { email, returnTo }: CustomerEmailDto): Promise<void> {
    await this.customers.resendVerification(storeSlug, email, returnTo);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "E-mail a link to replace the password of this shop's account — 202 for any address" })
  async forgotPassword(@Param('storeSlug') storeSlug: string, @Body() { email, returnTo }: CustomerEmailDto): Promise<void> {
    await this.customers.forgotPassword(storeSlug, email, returnTo);
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
  @ApiOperation({ summary: "Rotate a shopper's refresh token; a shopkeeper's, or another shop's, is invalid here" })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_TOKEN_INVALID or AUTH_REFRESH_REUSED' })
  refresh(@Param('storeSlug') storeSlug: string, @Body() { refreshToken }: RefreshDto): Promise<AuthSession> {
    return this.customers.refresh(storeSlug, refreshToken);
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
  @ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
  me(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerProfile> {
    return this.customers.me(storeSlug, customer.userId);
  }

  @Put('me/notifications')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "The shopper's notices by e-mail at this shop, all three at once" })
  @ApiOkResponse({ type: CustomerNotificationsResponse })
  updateNotifications(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: UpdateCustomerNotificationsDto,
  ): Promise<CustomerNotifications> {
    return this.customers.updateNotifications(storeSlug, customer.userId, dto);
  }

  @Put('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CustomerAuthGuard)
  @RouteConfig({ rateLimit })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the shopper's password, given the current one; the other devices sign in again" })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'AUTH_PASSWORD_WRONG — the current password does not match' })
  @ApiConflictResponse({ description: 'AUTH_PASSWORD_NOT_SET — an account opened through Google creates one by the e-mailed link' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  async changePassword(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: ChangeCustomerPasswordDto,
  ): Promise<void> {
    await this.customers.changePassword(storeSlug, customer.userId, customer.sessionId, dto.currentPassword, dto.newPassword);
  }

  @Post('me/password/link')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CustomerAuthGuard)
  @RouteConfig({ rateLimit })
  @ApiBearerAuth()
  @ApiOperation({ summary: "E-mail the shopper the link that sets their password — for an account opened through Google" })
  @ApiAcceptedResponse()
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  async sendPasswordLink(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() { returnTo }: CustomerPasswordLinkDto,
  ): Promise<void> {
    await this.customers.sendPasswordLink(storeSlug, customer.userId, returnTo);
  }

  @Delete('me/sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "End every session of the shopper's account at this shop, this one too" })
  @ApiNoContentResponse()
  async signOutEverywhere(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<void> {
    await this.customers.signOutEverywhere(storeSlug, customer.userId);
  }

  @Patch('me')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the shopper's name, phone, CPF or birth date at this shop" })
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
