// Nest
import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

// Types
import type { AcceptedAffiliate, AffiliateInvitation, AffiliateSignUpResult, AffiliateSlugAvailability } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser, Public } from '../auth/auth.decorators.js';
import { AffiliateInvitationsService } from './affiliate-invitations.service.js';
import { AffiliateAcceptanceDto, AffiliateSignUpDto, AffiliateSlugQueryDto } from './dto/affiliate.dto.js';
import { AcceptedAffiliateResponse, AffiliateInvitationResponse, AffiliateSignUpResultResponse, AffiliateSlugAvailabilityResponse } from './dto/affiliate.response.js';

/** Keyed by IP, like the sign-in's: a token is unguessable, and this keeps anyone from trying. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

/**
 * An invite by the token in its e-mailed link (IMPULSEIA-103). Read, the `/name` tried and the account
 * made are public — the token is the key; accepting with an account that exists needs its session.
 * Not under a page's path: a page locked for want of payment does not close an invite to it.
 */
@ApiTags('affiliates')
@ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
@ApiNotFoundResponse({ description: 'AFFILIATE_INVITE_NOT_FOUND' })
@ApiGoneResponse({ description: 'AFFILIATE_INVITE_EXPIRED' })
@Controller('affiliate-invites/:token')
export class AffiliateInvitesController {
  constructor(private readonly invitations: AffiliateInvitationsService) {}

  @Get()
  @Public()
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'The invite: the shop, the condition, the terms, whether the e-mail has an account, a /name to start from' })
  @ApiOkResponse({ type: AffiliateInvitationResponse })
  read(@Param('token') token: string): Promise<AffiliateInvitation> {
    return this.invitations.read(token);
  }

  @Get('slug')
  @Public()
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'Whether a /name can be the affiliate\'s in the shop, as it would be kept' })
  @ApiOkResponse({ type: AffiliateSlugAvailabilityResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_ACCEPTANCE_INVALID' })
  slug(@Param('token') token: string, @Query() query: AffiliateSlugQueryDto): Promise<AffiliateSlugAvailability> {
    return this.invitations.slug(token, query.slug);
  }

  @Post('accept')
  @HttpCode(200)
  @RouteConfig({ rateLimit })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept, signed in with the bee-link account of the e-mail invited' })
  @ApiOkResponse({ type: AcceptedAffiliateResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_ACCEPTANCE_INVALID' })
  @ApiForbiddenResponse({ description: 'AFFILIATE_INVITE_EMAIL_MISMATCH, with the e-mail it is for' })
  @ApiConflictResponse({ description: 'AFFILIATE_SLUG_UNAVAILABLE · AFFILIATE_TERMS_CHANGED · AFFILIATE_ALREADY_LINKED' })
  accept(@Param('token') token: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: AffiliateAcceptanceDto): Promise<AcceptedAffiliate> {
    return this.invitations.accept(token, current.id, dto);
  }

  @Post('sign-up')
  @Public()
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "Make the invited e-mail's bee-link account, already verified, and accept — in one go; answers its session" })
  @ApiCreatedResponse({ type: AffiliateSignUpResultResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_ACCEPTANCE_INVALID' })
  @ApiConflictResponse({ description: 'AUTH_EMAIL_TAKEN · AFFILIATE_SLUG_UNAVAILABLE · AFFILIATE_TERMS_CHANGED' })
  signUp(@Param('token') token: string, @Body() dto: AffiliateSignUpDto, @Headers('user-agent') userAgent?: string): Promise<AffiliateSignUpResult> {
    return this.invitations.signUp(token, dto, userAgent);
  }
}
