// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { RealtimeTicket } from '@harness-monorepo/contracts';

export class RealtimeTicketResponse implements RealtimeTicket {
  @ApiProperty({ description: 'Single use: handed to the socket as `auth.ticket`.' })
  ticket!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}
