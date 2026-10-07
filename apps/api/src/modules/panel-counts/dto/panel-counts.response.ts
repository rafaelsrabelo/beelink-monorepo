// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { PanelCounts } from '@harness-monorepo/contracts';

export class PanelCountsResponse implements PanelCounts {
  @ApiProperty({ description: 'Orders still asking something of the shop: every status but DELIVERED and CANCELLED — the total of the list filtered by `status=OPEN`.' })
  openOrders!: number;

  @ApiProperty({ description: "Conversations holding a customer's message the shop has not read." })
  unreadConversations!: number;

  @ApiProperty({ description: 'Those messages themselves: what the bell adds up.' })
  unreadMessages!: number;

  @ApiProperty({ description: 'Reviews written since the owner last opened their list, hidden or not.' })
  unseenReviews!: number;
}
