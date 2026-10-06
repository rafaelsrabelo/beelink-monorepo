// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { IntegrationStatus, MetaPixelConnection } from '@harness-monorepo/contracts';

const STATUSES = ['DISCONNECTED', 'CONNECTED', 'NEEDS_RECONNECT'] as const satisfies readonly IntegrationStatus[];

export class MetaPixelConnectionResponse implements MetaPixelConnection {
  @ApiProperty({ enum: STATUSES, description: 'CONNECTED while an ID is saved; DISCONNECTED otherwise.' }) status!: IntegrationStatus;
  @ApiProperty({ nullable: true, type: String, example: '1234567890123456', description: 'Digits only. Null while disconnected.' }) pixelId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) connectedAt!: string | null;
}
