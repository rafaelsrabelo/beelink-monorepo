// Nest
import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { StorePopupOverview } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { StorePopupDto } from './dto/popup.dto.js';
import { StorePopupOverviewResponse } from './dto/popup.response.js';
import { PopupService } from './popup.service.js';

/**
 * The shop's first-purchase pop-up (BEELINK-306), as its owner configures it. Closed, like every
 * panel route — the global guard takes the shopkeeper's token and refuses a shopper's.
 */
@ApiTags('promotions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/popup')
export class PopupController {
  constructor(private readonly popup: PopupService) {}

  @Get()
  @ApiOperation({ summary: "The shop's first-purchase pop-up — the defaults, switched off, until first saved — with what it announces now and what it may name" })
  @ApiOkResponse({ type: StorePopupOverviewResponse })
  overview(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<StorePopupOverview> {
    return this.popup.overview(storeSlug, current.id);
  }

  @Put()
  @ApiOperation({ summary: 'Save the pop-up, whole. A discount typed by hand is refused: the number comes from {beneficio}' })
  @ApiOkResponse({ type: StorePopupOverviewResponse })
  @ApiBadRequestResponse({ description: 'POPUP_SETTINGS_INVALID · POPUP_TEXT_PROMISES_NUMBER · POPUP_BENEFIT_INVALID' })
  save(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: StorePopupDto): Promise<StorePopupOverview> {
    return this.popup.save(storeSlug, current.id, dto);
  }
}
