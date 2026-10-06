// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

// Types
import type { OpeningTemplatesQuery, PageErrorCode, PageKind, PageTemplatesQuery, StoreType } from '@harness-monorepo/contracts';

// App
import { STORE_TYPES } from '../../stores/stores.constants.js';
import { PageScopeDto } from './page-scope.dto.js';

const PAGE_KINDS = ['HOME', 'LANDING'] as const satisfies readonly PageKind[];

/** One shop's gallery: of a page that exists (`pageId`, the home when absent), or of one about to be made (`kind`). */
export class PageTemplatesQueryDto extends PageScopeDto implements PageTemplatesQuery {
  @ApiPropertyOptional({ enum: PAGE_KINDS, description: 'A page that does not exist yet: the models a new one of this kind would open with. Ignored when `pageId` is sent.' })
  @IsOptional()
  @IsIn(PAGE_KINDS, { context: { errorCode: 'PAGE_TEMPLATE_UNAVAILABLE' satisfies PageErrorCode } })
  kind?: PageKind;
}

/** The models a store may open with, asked before the store exists. */
export class OpeningTemplatesQueryDto implements OpeningTemplatesQuery {
  @ApiProperty({ enum: STORE_TYPES })
  @IsIn(STORE_TYPES, { context: { errorCode: 'PAGE_TEMPLATE_UNAVAILABLE' satisfies PageErrorCode } })
  storeType!: StoreType;

  @ApiPropertyOptional({ format: 'uuid', description: 'The category picked for the store. It orders the answer; one that does not exist suggests nothing.' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
