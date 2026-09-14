// Nest
import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// App
import { env } from '../../shared/config/env.js';
import { Public } from './auth.decorators.js';
import { AuthService } from './auth.service.js';
import {
  EmailDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto.js';
import { AuthSessionResponse } from './dto/auth.response.js';
import { UserResponse } from '../users/dto/user.response.js';
import { SessionService } from './session.service.js';

/** Keyed by IP, which only means anything because the API trusts the web app's forwarded address. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

@ApiTags('auth')
@ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many attempts from this address' })
@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('register')
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'Create an account and send the verification e-mail' })
  @ApiCreatedResponse({ type: UserResponse })
  @ApiConflictResponse({ description: 'AUTH_EMAIL_TAKEN' })
  register(@Body() dto: RegisterDto): Promise<UserResponse> {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify an e-mail with the token from its link' })
  async verifyEmail(@Body() { token }: VerifyEmailDto): Promise<void> {
    await this.auth.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'Send the verification e-mail again — answers 202 for any address' })
  async resendVerification(@Body() { email }: EmailDto): Promise<void> {
    await this.auth.resendVerification(email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'Open a session' })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_INVALID_CREDENTIALS' })
  @ApiForbiddenResponse({ description: 'AUTH_EMAIL_NOT_VERIFIED' })
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string): Promise<AuthSessionResponse> {
    return this.auth.login(dto, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and mint a new access token' })
  @ApiOkResponse({ type: AuthSessionResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_TOKEN_INVALID or AUTH_REFRESH_REUSED' })
  refresh(@Body() { refreshToken }: RefreshDto): Promise<AuthSessionResponse> {
    return this.sessions.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End this device session — idempotent' })
  async logout(@Body() { refreshToken }: LogoutDto): Promise<void> {
    await this.sessions.revokeByRefreshToken(refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'E-mail a reset link — answers 202 for any address' })
  async forgotPassword(@Body() { email }: EmailDto): Promise<void> {
    await this.auth.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password and end every session of the account' })
  async resetPassword(@Body() { token, password }: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(token, password);
  }
}
