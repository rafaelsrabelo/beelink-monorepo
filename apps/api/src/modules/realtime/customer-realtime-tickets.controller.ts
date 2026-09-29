// Nest
import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// App
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { RealtimeTicketResponse } from './realtime-tickets.controller.js';
import { RealtimeTicketsService } from './realtime-tickets.service.js';

/**
 * A shopper's pass to their own room at the shop. `@Public()` to the global guard, which refuses a
 * shopper's token by design, and closed by `CustomerAuthGuard`, which refuses a shopkeeper's.
 */
@ApiTags('customers')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/realtime')
export class CustomerRealtimeTicketsController {
  constructor(private readonly tickets: RealtimeTicketsService) {}

  @Post('ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A ticket to the shopper's room at this shop: short, single use, for the shop window's socket" })
  @ApiOkResponse({ type: RealtimeTicketResponse })
  issue(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<RealtimeTicketResponse> {
    return this.tickets.issueForCustomer(storeSlug, customer.userId);
  }
}
