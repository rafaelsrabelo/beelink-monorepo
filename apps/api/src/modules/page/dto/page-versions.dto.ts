// Nest
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

// Types
import type { PublishPagePayload } from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import { blankToNull } from '../../stores/dto/store-fields.dto.js';
import { PAGE_VERSION_NOTE_MAX_LENGTH } from '../pages.constants.js';

export class PublishPageDto implements PublishPagePayload {
  @ApiPropertyOptional({ maxLength: PAGE_VERSION_NOTE_MAX_LENGTH, nullable: true, type: String, description: 'A line for the history.' })
  @IsOptional()
  @IsString()
  @MaxCodePoints(PAGE_VERSION_NOTE_MAX_LENGTH)
  @blankToNull
  note?: string | null;
}
