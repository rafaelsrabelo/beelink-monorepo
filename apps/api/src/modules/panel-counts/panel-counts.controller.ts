// Nest
import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { PanelCounts } from '@harness-monorepo/contracts';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { CurrentUser } from '../auth/auth.decorators.js';
import { PanelCountsResponse } from './dto/panel-counts.response.js';
import { PanelCountsService } from './panel-counts.service.js';

/** The numbers beside the panel's menu items. Closed, like every panel route; a shopper's token is refused. */
@ApiTags('panel')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/panel-counts')
export class PanelCountsController {
  constructor(private readonly counts: PanelCountsService) {}

  @Get()
  @ApiOperation({ summary: "What waits in each area of the shop's panel: open orders, unread conversations, unseen reviews" })
  @ApiOkResponse({ type: PanelCountsResponse })
  read(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<PanelCounts> {
    return this.counts.read(storeSlug, current.id);
  }
}
