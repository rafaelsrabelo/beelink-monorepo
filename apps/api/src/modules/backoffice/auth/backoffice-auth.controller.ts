// Nest
import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { AuditTrail } from '../audit/audit-trail.js';
import type { AuthenticatedAdmin, BackofficeRequest } from '../backoffice.request.js';

// App
import { env } from '../../../shared/config/env.js';
import { Public } from '../../auth/auth.decorators.js';
import { AuditInterceptor } from '../audit/audit.interceptor.js';
import { Audited, CurrentAdmin, Trail, Unaudited } from '../backoffice.decorators.js';
import { BackofficeGuard } from '../backoffice.guard.js';
import { originOf } from '../backoffice.request.js';
import { BackofficeAuthService } from './backoffice-auth.service.js';
import { BackofficeSessionService } from './backoffice-session.service.js';
import { BackofficeRefreshDto, BackofficeSignInDto, BackofficeVerifyDto } from './dto/backoffice-auth.dto.js';
import { BackofficeSessionResponse, BackofficeSignInChallengeResponse } from './dto/backoffice-auth.response.js';

/** Per IP, the numbers the panel's own sign-in is limited by: this is the same stranger guessing. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

/**
 * The way into the backoffice (BEELINK-227), and the one controller under `/backoffice` that is not
 * behind `BackofficeGuard` — there is no session yet. JSON in and out, no cookie: the web wraps it,
 * as it wraps the panel's. Its writes are audited like every other.
 */
@ApiTags('backoffice')
@Public()
@UseInterceptors(AuditInterceptor)
@Controller('backoffice/auth')
export class BackofficeAuthController {
  constructor(
    private readonly auth: BackofficeAuthService,
    private readonly sessions: BackofficeSessionService,
  ) {}

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @Audited('BACKOFFICE_SIGN_IN_CODE_SENT', 'BACKOFFICE_SIGN_IN_FAILED')
  @ApiOperation({ summary: 'Step one: the password. An administrator is e-mailed a code' })
  @ApiOkResponse({ type: BackofficeSignInChallengeResponse })
  @ApiUnauthorizedResponse({ description: 'BACKOFFICE_INVALID_CREDENTIALS — the same for a wrong password and for an account that is no administrator' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  signIn(@Body() dto: BackofficeSignInDto, @Trail() trail: AuditTrail): Promise<BackofficeSignInChallengeResponse> {
    return this.auth.signIn(dto, trail);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit })
  @Audited('BACKOFFICE_SIGNED_IN', 'BACKOFFICE_SIGN_IN_FAILED')
  @ApiOperation({ summary: 'Step two: the e-mailed code. Opens a backoffice session' })
  @ApiOkResponse({ type: BackofficeSessionResponse })
  @ApiUnauthorizedResponse({ description: 'BACKOFFICE_CODE_INVALID — wrong, expired, spent or out of attempts' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  verify(@Body() dto: BackofficeVerifyDto, @Req() request: BackofficeRequest, @Trail() trail: AuditTrail): Promise<BackofficeSessionResponse> {
    return this.auth.verify(dto, originOf(request), trail);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Unaudited('Renewing a session changes nothing of the platform, and happens every ten minutes of use')
  @ApiOperation({ summary: 'Rotate the refresh token and mint a new access token — never past the end of the session' })
  @ApiOkResponse({ type: BackofficeSessionResponse })
  @ApiUnauthorizedResponse({ description: 'BACKOFFICE_SESSION_INVALID or BACKOFFICE_REFRESH_REUSED' })
  refresh(@Body() { refreshToken }: BackofficeRefreshDto): Promise<BackofficeSessionResponse> {
    return this.sessions.refresh(refreshToken);
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(BackofficeGuard)
  @Audited('BACKOFFICE_SIGNED_OUT')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End this backoffice session' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'BACKOFFICE_UNAUTHENTICATED' })
  async signOut(@CurrentAdmin() admin: AuthenticatedAdmin, @Trail() trail: AuditTrail): Promise<void> {
    await this.sessions.end(admin.sessionId);
    await trail.record('BACKOFFICE_SIGNED_OUT', { target: { type: 'USER', id: admin.id, label: admin.email } });
  }
}
