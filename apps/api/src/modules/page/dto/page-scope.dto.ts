// Nest
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

// Types
import type { PageErrorCode } from '@harness-monorepo/contracts';

/** The page a collection route acts on. Left out, the shop's home — every call made before pages existed. */
export class PageScopeDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'The page. Absent is the home.' })
  @IsOptional()
  @IsUUID('all', { context: { errorCode: 'PAGE_NOT_FOUND' satisfies PageErrorCode } })
  pageId?: string;
}
