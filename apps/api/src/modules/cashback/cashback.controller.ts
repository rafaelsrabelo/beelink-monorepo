// Nest
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { CashbackOverview } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { CashbackService } from './cashback.service.js';
import { CashbackSettingsDto } from './dto/cashback.dto.js';
import { CashbackOverviewResponse } from './dto/cashback.response.js';

/**
 * The shop's cashback rules (BEELINK-238), as its owner sets them. Closed, like every panel route —
 * the global guard takes the shopkeeper's token and refuses a shopper's.
 */
@ApiTags('cashback')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/cashback')
export class CashbackController {
  constructor(private readonly cashback: CashbackService) {}

  @Get()
  @ApiOperation({ summary: "The shop's cashback rules — the defaults, switched off, until first saved — and the credit it owes" })
  @ApiOkResponse({ type: CashbackOverviewResponse })
  overview(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<CashbackOverview> {
    return this.cashback.overview(storeSlug, current.id);
  }

  @Put()
  @ApiOperation({ summary: 'Save the rules, whole. They apply to orders placed from now on; credit already given keeps its validity' })
  @ApiOkResponse({ type: CashbackOverviewResponse })
  @ApiBadRequestResponse({ description: 'CASHBACK_SETTINGS_INVALID' })
  save(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: CashbackSettingsDto): Promise<CashbackOverview> {
    return this.cashback.save(storeSlug, current.id, dto);
  }
}
