// Nest
import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { CurrentUser } from '../auth/auth.decorators.js';
import { RealtimeTicketResponse } from './dto/realtime-ticket.response.js';
import { RealtimeTicketsService } from './realtime-tickets.service.js';

/** The shop's pass to its panel's room. Closed, like every panel route; a shopper's token is refused. */
@ApiTags('realtime')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/realtime')
export class RealtimeTicketsController {
  constructor(private readonly tickets: RealtimeTicketsService) {}

  @Post('ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A ticket to the shop's room: short, single use, for the panel's socket" })
  @ApiOkResponse({ type: RealtimeTicketResponse })
  issue(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<RealtimeTicketResponse> {
    return this.tickets.issueForShop(storeSlug, current);
  }
}
