// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

// Types
import type { ComponentSpan, MoveComponentPayload, PageErrorCode } from '@harness-monorepo/contracts';

// App
import { COMPONENT_SPANS } from '../page.constants.js';

/**
 * A component moved into another band, or to another place in its own.
 *
 * The span rides along so the row it joins has room for it in the same write — a patch after the
 * move is a second write, and a failure between the two leaves a block too wide for the row it is in.
 */
export class MoveComponentDto implements MoveComponentPayload {
  @ApiProperty({ format: 'uuid', description: 'The band it goes to. Its own band reorders it there.' })
  @IsUUID('all')
  sectionId!: string;

  @ApiPropertyOptional({ minimum: 0, description: 'Its place in that band, 0 first. Absent or past the end: last.' })
  @IsOptional()
  @IsInt({ context: { errorCode: 'POSITION_INVALID' satisfies PageErrorCode } })
  @Min(0, { context: { errorCode: 'POSITION_INVALID' satisfies PageErrorCode } })
  position?: number;

  // Not `@IsOptional()`, which lets a null through to the NOT NULL column as a 500.
  @ApiPropertyOptional({ enum: COMPONENT_SPANS, description: 'Absent: the span it already has.' })
  @ValidateIf((dto: MoveComponentDto) => dto.span !== undefined)
  @IsIn(COMPONENT_SPANS, { context: { errorCode: 'COMPONENT_SPAN_INVALID' satisfies PageErrorCode } })
  span?: ComponentSpan;
}
