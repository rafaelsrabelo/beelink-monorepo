// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

// Types
import type { CreateLeadPayload, LeadListQuery, LeadStatus, UpdateLeadPayload } from '@harness-monorepo/contracts';

// App
import { blankToNull, trim } from '../../stores/dto/store-fields.dto.js';
import {
  LEADS_PAGE_SIZE,
  LEADS_PAGE_SIZE_MAX,
  LEAD_NAME_MAX_LENGTH,
  LEAD_NAME_MIN_LENGTH,
  LEAD_STATUSES,
} from '../leads.constants.js';

/**
 * What a visitor sends.
 *
 * `answers` is `@IsObject()` and nothing more on purpose: what may be inside depends on the form
 * the body names, and that is checked in `lead-answers.ts` against the fields it declares. A DTO
 * cannot know the form before it has been looked up.
 */
export class CreateLeadDto implements CreateLeadPayload {
  @ApiProperty({ format: 'uuid', description: 'The contact form the answers belong to.' })
  @IsUUID()
  componentId!: string;

  @ApiProperty({ minLength: LEAD_NAME_MIN_LENGTH, maxLength: LEAD_NAME_MAX_LENGTH })
  @IsString()
  @trim
  @MinLength(LEAD_NAME_MIN_LENGTH)
  @MaxLength(LEAD_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Keyed by the form’s field ids. Checked against the form; a key it does not have is refused.',
  })
  @IsObject()
  answers!: Record<string, string>;

  @ApiPropertyOptional({
    description: 'The trap. Drawn out of sight; a body that carries a value is answered and not saved.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class UpdateLeadDto implements UpdateLeadPayload {
  @ApiProperty({ enum: LEAD_STATUSES })
  @IsIn(LEAD_STATUSES)
  status!: LeadStatus;
}

/** How the panel asks for a page. Absent means all, so a bare `GET` is the first page of everything. */
export class ListLeadsDto implements LeadListQuery {
  @ApiPropertyOptional({ enum: LEAD_STATUSES })
  @IsOptional()
  @IsIn(LEAD_STATUSES)
  @blankToNull
  status?: LeadStatus;

  // `@Type(() => Number)` and not the pipe's implicit conversion — apps/api/AGENTS.md, rule 6.
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: LEADS_PAGE_SIZE_MAX, default: LEADS_PAGE_SIZE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pageSize?: number;
}
