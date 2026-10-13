// Nest
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

// Types
import type { PlanCatalog } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { BillingService } from './billing.service.js';
import { PlanCatalogResponse } from './dto/billing.response.js';

/**
 * What a page costs (BEELINK-219), read by anyone: a price is said before there is an account to
 * say it to. A controller of its own because `@ApiBearerAuth()` on a class marks every route of it
 * as closed, the public one too.
 */
@ApiTags('billing')
@Public()
@Controller('billing/plans')
export class PlansController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'The plans on sale, each with what its cycles cost, and the days a new page is tried for free' })
  @ApiOkResponse({ type: PlanCatalogResponse })
  catalog(): Promise<PlanCatalog> {
    return this.billing.plans();
  }
}
