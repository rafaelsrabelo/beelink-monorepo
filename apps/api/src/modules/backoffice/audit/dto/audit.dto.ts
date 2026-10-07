// Nest
import { ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { IsISO8601, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

// Types
import type { BackofficeAuditAction, BackofficeAuditActorKind, BackofficeAuditQuery } from '@harness-monorepo/contracts';

// App
import { BACKOFFICE_AUDIT_PAGE_SIZE, BACKOFFICE_AUDIT_PAGE_SIZE_MAX } from '../../backoffice.constants.js';
import { BACKOFFICE_AUDIT_ACTIONS, BACKOFFICE_AUDIT_ACTOR_KINDS } from '../audit.actions.js';

export class ListAuditDto implements BackofficeAuditQuery {
  @ApiPropertyOptional({ format: 'uuid', description: "An administrator's account id." })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ enum: BACKOFFICE_AUDIT_ACTOR_KINDS })
  @IsOptional()
  @IsIn(BACKOFFICE_AUDIT_ACTOR_KINDS)
  actorKind?: BackofficeAuditActorKind;

  @ApiPropertyOptional({ enum: BACKOFFICE_AUDIT_ACTIONS })
  @IsOptional()
  @IsIn(BACKOFFICE_AUDIT_ACTIONS)
  action?: BackofficeAuditAction;

  @ApiPropertyOptional({ format: 'date-time', description: 'Inclusive.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Exclusive.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: BACKOFFICE_AUDIT_PAGE_SIZE_MAX, default: BACKOFFICE_AUDIT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BACKOFFICE_AUDIT_PAGE_SIZE_MAX)
  pageSize?: number;
}
