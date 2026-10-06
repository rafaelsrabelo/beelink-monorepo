// Nest
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

// Types
import type { PageErrorCode, TemplatePreviewQuery } from '@harness-monorepo/contracts';

// App
import { PageScopeDto } from './page-scope.dto.js';

/** The page a model is previewed on — the home when none is named — and what the model is built around. */
export class TemplatePreviewQueryDto extends PageScopeDto implements TemplatePreviewQuery {
  @ApiPropertyOptional({ format: 'uuid', description: 'Read by a model that needs a PRODUCT; ignored by the others.' })
  @IsOptional()
  @IsUUID('all', { context: { errorCode: 'PAGE_PRODUCT_INVALID' satisfies PageErrorCode } })
  productId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Read by a model that needs a CATEGORY; ignored by the others.' })
  @IsOptional()
  @IsUUID('all', { context: { errorCode: 'PAGE_CATEGORY_INVALID' satisfies PageErrorCode } })
  categoryId?: string;
}
