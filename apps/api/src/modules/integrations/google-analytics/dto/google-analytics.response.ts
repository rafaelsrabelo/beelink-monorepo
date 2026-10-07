// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { GoogleAnalyticsConnection, IntegrationStatus } from '@harness-monorepo/contracts';

const STATUSES = ['DISCONNECTED', 'CONNECTED', 'NEEDS_RECONNECT'] as const satisfies readonly IntegrationStatus[];

export class GoogleAnalyticsConnectionResponse implements GoogleAnalyticsConnection {
  @ApiProperty({ enum: STATUSES, description: 'CONNECTED while an ID is saved; DISCONNECTED otherwise.' }) status!: IntegrationStatus;
  @ApiProperty({ nullable: true, type: String, example: 'G-AB12CD34EF', description: '`G-` and capital letters or digits. Null while disconnected.' }) measurementId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) connectedAt!: string | null;
}
