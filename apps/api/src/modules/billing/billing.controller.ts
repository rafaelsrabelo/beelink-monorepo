// Nest
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { StoreSubscriptionAnswer, SubscriptionChoice } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { BillingService } from './billing.service.js';
import { StoreSubscriptionAnswerResponse, SubscriptionChoiceResponse } from './dto/billing.response.js';
import { SubscriptionChoiceDto } from './dto/subscription-choice.dto.js';
import { StoreSubscriptions } from './store-subscriptions.service.js';

/** The shop writes' own pair, as the billing account's write: each choice calls a third party whose quota is one for every shopkeeper. */
const writeRateLimit = { max: env.STORE_WRITE_RATE_LIMIT_MAX, timeWindow: env.STORE_WRITE_RATE_LIMIT_WINDOW };

/**
 * A page's subscription to bee-link (BEELINK-219), as its owner reads it and chooses its cycle
 * (BEELINK-292). Closed, like every panel route — the global guard takes the shopkeeper's token and
 * refuses a shopper's.
 */
@ApiTags('billing')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/subscription')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly subscriptions: StoreSubscriptions,
  ) {}

  @Get()
  @ApiOperation({ summary: "Where the page stands with bee-link — its trial, its plan, its paid period, the invoice waiting to be paid — and whether this deployment charges at all. `subscription` is null for a page from before subscriptions existed" })
  @ApiOkResponse({ type: StoreSubscriptionAnswerResponse })
  subscription(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<StoreSubscriptionAnswer> {
    return this.billing.subscription(storeSlug, current.id);
  }

  @Put()
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: "Choose the cycle the page's plan is paid in: its subscription is made at bee-link's own Asaas account, with no card, and the invoice of its first charge is answered. Safe to repeat — the same cycle answers the same invoice, another one replaces a subscription not yet paid. The page's status does not change here" })
  @ApiOkResponse({ type: SubscriptionChoiceResponse })
  @ApiBadRequestResponse({ description: 'BILLING_CYCLE_INVALID — Asaas was not asked' })
  @ApiConflictResponse({
    description:
      'BILLING_NOT_ENFORCED · BILLING_ACCOUNT_REQUIRED · BILLING_SUBSCRIPTION_MISSING · BILLING_PAGE_EXEMPT · BILLING_PAGE_ACTIVE · BILLING_PLAN_UNAVAILABLE · BILLING_SUBSCRIPTION_BUSY — refused before Asaas was asked. BILLING_ACCOUNT_BUSY — the account\'s customer is being told to Asaas. BILLING_SUBSCRIPTION_PAID — Asaas says the subscription the page has was paid; nothing was made or removed',
  })
  @ApiBadGatewayResponse({ description: 'BILLING_SUBSCRIPTION_REFUSED · BILLING_CUSTOMER_REFUSED — Asaas refused; nothing was made' })
  @ApiServiceUnavailableResponse({ description: 'BILLING_UNAVAILABLE — this deployment has no Asaas account of bee-link\'s own. BILLING_UNREACHABLE — Asaas did not answer; the same choice again picks the talk up' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many writes from this address' })
  choose(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() body: SubscriptionChoiceDto): Promise<SubscriptionChoice> {
    return this.subscriptions.choose(storeSlug, current.id, body.cycle);
  }
}
