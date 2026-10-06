// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

// Types
import type { ApplyTemplatePayload, PageErrorCode, TemplateId } from '@harness-monorepo/contracts';

// App
import { TEMPLATE_IDS } from '../template-catalog.js';

/** The model a page's draft is replaced with, and what it is built around when it asks. */
export class ApplyTemplateDto implements ApplyTemplatePayload {
  @ApiProperty({ enum: TEMPLATE_IDS })
  @IsIn(TEMPLATE_IDS, { context: { errorCode: 'PAGE_TEMPLATE_UNAVAILABLE' satisfies PageErrorCode } })
  template!: TemplateId;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Read by a model that needs a PRODUCT; ignored by the others.' })
  @IsOptional()
  @IsUUID('all', { context: { errorCode: 'PAGE_PRODUCT_INVALID' satisfies PageErrorCode } })
  productId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Read by a model that needs a CATEGORY; ignored by the others.' })
  @IsOptional()
  @IsUUID('all', { context: { errorCode: 'PAGE_CATEGORY_INVALID' satisfies PageErrorCode } })
  categoryId?: string | null;
}
