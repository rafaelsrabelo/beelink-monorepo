// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MaxLength, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Types
import type {
  CreateLandingPayload,
  LandingTemplateId,
  PageErrorCode,
  PageSeo,
  PageStatus,
  UpdatePagePayload,
} from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import { blankToNull, trim } from '../../stores/dto/store-fields.dto.js';
import { LANDING_TEMPLATE_IDS } from '../landing-templates.js';
import { COMPONENT_URL_MAX_LENGTH } from '../page.constants.js';
import { PAGE_SEO_DESCRIPTION_MAX_LENGTH, PAGE_SEO_TITLE_MAX_LENGTH, PAGE_STATUSES, PAGE_TITLE_MAX_LENGTH } from '../pages.constants.js';

/**
 * What an address may be sent as, before it is normalised: generous, because "Lançamento Whey 900 g"
 * is a fine thing to type and the API folds it. What is stored is at most `PAGE_SLUG_MAX_LENGTH`.
 */
const SLUG_INPUT_MAX_LENGTH = 120;

/** What a search result and a shared link say. A key left out is left alone; null clears it. */
export class PageSeoDto implements Partial<PageSeo> {
  @ApiPropertyOptional({ maxLength: PAGE_SEO_TITLE_MAX_LENGTH, nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxCodePoints(PAGE_SEO_TITLE_MAX_LENGTH)
  @blankToNull
  title?: string | null;

  @ApiPropertyOptional({ maxLength: PAGE_SEO_DESCRIPTION_MAX_LENGTH, nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxCodePoints(PAGE_SEO_DESCRIPTION_MAX_LENGTH)
  @blankToNull
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, description: 'http(s). The picture a shared link shows.' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(COMPONENT_URL_MAX_LENGTH)
  @blankToNull
  imageUrl?: string | null;
}

export class CreateLandingDto implements CreateLandingPayload {
  @ApiProperty({ maxLength: PAGE_TITLE_MAX_LENGTH, example: 'Lançamento Whey Baunilha' })
  @IsString()
  @IsNotEmpty()
  @MaxCodePoints(PAGE_TITLE_MAX_LENGTH)
  @trim
  title!: string;

  @ApiPropertyOptional({ maxLength: SLUG_INPUT_MAX_LENGTH, description: 'Normalised by the API. Absent: from the title.' })
  @IsOptional()
  @IsString({ context: { errorCode: 'PAGE_SLUG_INVALID' satisfies PageErrorCode } })
  @MaxLength(SLUG_INPUT_MAX_LENGTH, { context: { errorCode: 'PAGE_SLUG_INVALID' satisfies PageErrorCode } })
  slug?: string;

  @ApiProperty({ enum: LANDING_TEMPLATE_IDS })
  @IsIn(LANDING_TEMPLATE_IDS, { context: { errorCode: 'PAGE_TEMPLATE_UNAVAILABLE' satisfies PageErrorCode } })
  template!: LandingTemplateId;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'Every template but em-branco is built around one.' })
  @IsOptional()
  @IsUUID('all', { context: { errorCode: 'PAGE_PRODUCT_INVALID' satisfies PageErrorCode } })
  productId?: string | null;

  @ApiPropertyOptional({ default: false })
  @ValidateIf((dto: CreateLandingDto) => dto.inMenu !== undefined)
  @IsBoolean()
  inMenu?: boolean;

  @ApiPropertyOptional({ default: true })
  @ValidateIf((dto: CreateLandingDto) => dto.usesChrome !== undefined)
  @IsBoolean()
  usesChrome?: boolean;
}

/**
 * A patch of a landing. A key left out is a column left alone. `ValidateIf` rather than
 * `IsOptional` on the NOT NULL columns: `IsOptional` lets a null through, and a null there was a 500.
 */
export class UpdatePageDto implements UpdatePagePayload {
  @ApiPropertyOptional({ maxLength: PAGE_TITLE_MAX_LENGTH })
  @ValidateIf((dto: UpdatePageDto) => dto.title !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxCodePoints(PAGE_TITLE_MAX_LENGTH)
  @trim
  title?: string;

  @ApiPropertyOptional({ maxLength: SLUG_INPUT_MAX_LENGTH, description: 'Normalised by the API. The old address stops answering.' })
  @ValidateIf((dto: UpdatePageDto) => dto.slug !== undefined)
  @IsString({ context: { errorCode: 'PAGE_SLUG_INVALID' satisfies PageErrorCode } })
  @MaxLength(SLUG_INPUT_MAX_LENGTH, { context: { errorCode: 'PAGE_SLUG_INVALID' satisfies PageErrorCode } })
  slug?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdatePageDto) => dto.inMenu !== undefined)
  @IsBoolean()
  inMenu?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((dto: UpdatePageDto) => dto.usesChrome !== undefined)
  @IsBoolean()
  usesChrome?: boolean;

  @ApiPropertyOptional({ enum: PAGE_STATUSES, description: 'PUBLISHED serves it at /<shop>/lp/<slug>; ARCHIVED takes it down.' })
  @ValidateIf((dto: UpdatePageDto) => dto.status !== undefined)
  @IsIn(PAGE_STATUSES)
  status?: PageStatus;

  @ApiPropertyOptional({ type: PageSeoDto })
  @ValidateIf((dto: UpdatePageDto) => dto.seo !== undefined)
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto;
}

/** The address being checked, and the page it may already be — a landing keeps its own. */
export class PageSlugQueryDto {
  @ApiProperty({ maxLength: SLUG_INPUT_MAX_LENGTH })
  @IsString()
  @MaxLength(SLUG_INPUT_MAX_LENGTH)
  slug!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'The landing being renamed, whose own address is free to it.' })
  @IsOptional()
  @IsUUID('all')
  except?: string;
}
