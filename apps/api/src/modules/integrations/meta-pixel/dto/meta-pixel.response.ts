// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { IntegrationStatus, MetaConversionsRefusal, MetaConversionsTokenState, MetaPixelConnection, MetaPixelConversions, MetaPixelTestEventOutcome, MetaPixelTestEventResult } from '@harness-monorepo/contracts';

const STATUSES = ['DISCONNECTED', 'CONNECTED', 'NEEDS_RECONNECT'] as const satisfies readonly IntegrationStatus[];

const TOKEN_STATES = ['NONE', 'SET', 'REJECTED'] as const satisfies readonly MetaConversionsTokenState[];
const REFUSALS = ['TOKEN_REJECTED', 'PIXEL_NOT_FOUND'] as const satisfies readonly MetaConversionsRefusal[];
const OUTCOMES = ['ACCEPTED', 'TOKEN_REJECTED', 'PIXEL_NOT_FOUND', 'EVENT_REFUSED', 'UNREACHABLE'] as const satisfies readonly MetaPixelTestEventOutcome[];

export class MetaPixelConversionsResponse implements MetaPixelConversions {
  @ApiProperty({ description: 'Whether this deployment can keep a token: false with no INTEGRATIONS_SECRET_KEY.' }) available!: boolean;
  @ApiProperty({ enum: TOKEN_STATES, description: 'Whether a token is saved, and whether Meta refused it. Never the token.' }) token!: MetaConversionsTokenState;
  @ApiProperty({ enum: REFUSALS, nullable: true }) refusal!: MetaConversionsRefusal | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) refusedAt!: string | null;
}

export class MetaPixelTestEventResponse implements MetaPixelTestEventResult {
  @ApiProperty({ enum: OUTCOMES }) outcome!: MetaPixelTestEventOutcome;
  @ApiProperty({ nullable: true, type: String, description: "Meta's own words for a refusal. Never the token." }) detail!: string | null;
}

export class MetaPixelConnectionResponse implements MetaPixelConnection {
  @ApiProperty({ enum: STATUSES, description: 'CONNECTED while an ID is saved; DISCONNECTED otherwise.' }) status!: IntegrationStatus;
  @ApiProperty({ nullable: true, type: String, example: '1234567890123456', description: 'Digits only. Null while disconnected.' }) pixelId!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) connectedAt!: string | null;
  @ApiProperty({ type: MetaPixelConversionsResponse }) conversions!: MetaPixelConversions;
}
