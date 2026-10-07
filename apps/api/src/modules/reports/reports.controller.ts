// Nest
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { CurrentUser } from '../auth/auth.decorators.js';
import { SalesByOriginDto, SalesByOriginResponse } from './dto/sales-by-origin.dto.js';
import { ReportsService } from './reports.service.js';

/** What a shop sold, for its owner. Closed, like every panel route; a shopper's token is refused. */
@ApiTags('reports')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales-by-origin')
  @ApiOperation({
    summary: "A period's sales by where their buyers came from: campaign, direct visit, or registered in the panel",
    description:
      'A sale is an order not cancelled; one charged online with something to pay counts only while its charge holds the money (confirmed, received or refunded in part) — the rule a purchase is told to Meta by. It counts on the day it was placed (`placedAt`), for its total (`totalCents`: delivery in, discounts and credit out — the `value` Meta receives; a partial refund is not taken off). ' +
      'Days are on the shop\'s clock, Brasília at a fixed -03:00, both counted; with neither, the thirty days ending today. ' +
      'Lines group by `utm_source`, `utm_medium` and `utm_campaign` as stored (the campaign case-sensitive); `utm_content` and `utm_term` do not split a line. Orders from before origins were kept are in the DIRECT line. The rows add up to the totals.',
  })
  @ApiOkResponse({ type: SalesByOriginResponse })
  @ApiBadRequestResponse({ description: 'REPORT_PERIOD_INVALID — not two days in YYYY-MM-DD, `from` after `to`, only one of them, or more than 366 days' })
  salesByOrigin(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Query() query: SalesByOriginDto): Promise<SalesByOriginResponse> {
    return this.reports.salesByOrigin(storeSlug, current.id, query);
  }
}
