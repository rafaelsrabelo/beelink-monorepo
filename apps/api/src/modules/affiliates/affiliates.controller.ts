// Nest
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { AffiliateProgramOverview } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { AffiliatesService } from './affiliates.service.js';
import { AffiliateProgramDto } from './dto/affiliate-program.dto.js';
import { AffiliateProgramOverviewResponse } from './dto/affiliate-program.response.js';

/**
 * The shop's affiliate programme (IMPULSEIA-101), as its owner sets it. Closed, like every panel
 * route — the global guard takes the shopkeeper's token — and to a page locked for want of payment.
 */
@ApiTags('affiliates')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN · PAGE_LOCKED' })
@Controller('stores/:storeSlug/affiliate-program')
export class AffiliatesController {
  constructor(private readonly affiliates: AffiliatesService) {}

  @Get()
  @ApiOperation({ summary: "The programme's rules, its tables and the running month's payout periods — opened, switched off, the first time it is read" })
  @ApiOkResponse({ type: AffiliateProgramOverviewResponse })
  overview(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<AffiliateProgramOverview> {
    return this.affiliates.overview(storeSlug, current.id);
  }

  @Put()
  @ApiOperation({ summary: 'Save the rules, whole. A different text of the terms moves their version up by one' })
  @ApiOkResponse({ type: AffiliateProgramOverviewResponse })
  @ApiBadRequestResponse({ description: 'AFFILIATE_PROGRAM_INVALID' })
  save(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: AffiliateProgramDto): Promise<AffiliateProgramOverview> {
    return this.affiliates.save(storeSlug, current.id, dto);
  }
}
