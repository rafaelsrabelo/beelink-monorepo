// Nest
import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { BillingService } from './billing.service.js';
import { StoreSubscriptionAnswerResponse } from './dto/billing.response.js';

/**
 * A page's subscription to bee-link (BEELINK-219), as its owner reads it. Closed, like every panel
 * route — the global guard takes the shopkeeper's token and refuses a shopper's.
 */
@ApiTags('billing')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/subscription')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @ApiOperation({ summary: "Where the page stands with bee-link — its trial, its plan, its paid period — and whether this deployment charges at all. `subscription` is null for a page from before subscriptions existed" })
  @ApiOkResponse({ type: StoreSubscriptionAnswerResponse })
  subscription(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<StoreSubscriptionAnswer> {
    return this.billing.subscription(storeSlug, current.id);
  }
}
