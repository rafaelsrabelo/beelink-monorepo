// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

// Types
import type {
  BannerTarget,
  CreateBannerPayload,
  ShowcaseLayout,
  UpdateBannerPayload,
} from '@harness-monorepo/contracts';

// App
import {
  BANNER_SUBTITLE_MAX_LENGTH,
  BANNER_TARGETS,
  BANNER_TITLE_MAX_LENGTH,
  BANNER_URL_MAX_LENGTH,
  SHOWCASE_LAYOUTS,
} from '../banners.constants.js';
import { blankToNull, imageUrl, trim } from '../../stores/dto/store-fields.dto.js';

export class CreateBannerDto implements CreateBannerPayload {
  @ApiProperty({ maxLength: BANNER_TITLE_MAX_LENGTH })
  @IsString()
  @MinLength(1)
  @MaxLength(BANNER_TITLE_MAX_LENGTH)
  @trim
  title!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: BANNER_SUBTITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(BANNER_SUBTITLE_MAX_LENGTH)
  @trim
  @blankToNull
  subtitle?: string | null;

  /**
   * Required, unlike a category's picture. A card of solid colour with words on it is not a banner,
   * and the rule used to live in the web, which quietly skipped a poster that had no image.
   */
  @ApiProperty()
  @imageUrl
  imageUrl!: string;

  @ApiProperty({ enum: SHOWCASE_LAYOUTS })
  @IsIn(SHOWCASE_LAYOUTS)
  layout!: ShowcaseLayout;

  @ApiProperty({ enum: BANNER_TARGETS })
  @IsIn(BANNER_TARGETS)
  target!: BannerTarget;

  @ApiPropertyOptional({ nullable: true, description: 'Required when target is CATEGORY.' })
  @IsOptional()
  @IsString()
  @blankToNull
  categorySlug?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Required when target is PRODUCT.' })
  @IsOptional()
  @IsString()
  @blankToNull
  productSlug?: string | null;

  /**
   * `require_protocol` is doing real work here, not tidying: it is what rejects
   * `javascript://x/%0aalert(1)`, which is otherwise a valid-looking URL that this value's one job
   * — being echoed into an anchor on the anonymous, indexed shop window — would then execute.
   */
  @ApiPropertyOptional({ nullable: true, maxLength: BANNER_URL_MAX_LENGTH })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(BANNER_URL_MAX_LENGTH)
  @blankToNull
  externalUrl?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** A patch: a key left out is a column left alone. `target` is the exception — see the service. */
export class UpdateBannerDto implements UpdateBannerPayload {
  @ApiPropertyOptional({ maxLength: BANNER_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(BANNER_TITLE_MAX_LENGTH)
  @trim
  title?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: BANNER_SUBTITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(BANNER_SUBTITLE_MAX_LENGTH)
  @trim
  @blankToNull
  subtitle?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @imageUrl
  imageUrl?: string;

  @ApiPropertyOptional({ enum: SHOWCASE_LAYOUTS })
  @IsOptional()
  @IsIn(SHOWCASE_LAYOUTS)
  layout?: ShowcaseLayout;

  @ApiPropertyOptional({ enum: BANNER_TARGETS })
  @IsOptional()
  @IsIn(BANNER_TARGETS)
  target?: BannerTarget;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @blankToNull
  categorySlug?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @blankToNull
  productSlug?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: BANNER_URL_MAX_LENGTH })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(BANNER_URL_MAX_LENGTH)
  @blankToNull
  externalUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
