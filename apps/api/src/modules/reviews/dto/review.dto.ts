// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';

// Types
import type {
  CreateReviewPayload,
  MarkReviewsSeenPayload,
  PublicReviewListQuery,
  ReviewRating,
  SetReviewVisibilityPayload,
  StoreReviewListQuery,
  StoreReviewStatus,
  UpdateReviewPayload,
} from '@harness-monorepo/contracts';

// App
import { blankToNull } from '../../stores/dto/store-fields.dto.js';
import { PUBLIC_REVIEWS_PAGE_SIZE, REVIEW_COMMENT_MAX, REVIEW_RATINGS, REVIEW_STATUSES, REVIEWS_PAGE_MAX, REVIEWS_PAGE_SIZE_MAX, STORE_REVIEWS_PAGE_SIZE } from '../reviews.constants.js';

const optional = ValidateIf((_, value) => value !== null && value !== undefined);

export class UpdateReviewDto implements UpdateReviewPayload {
  @ApiProperty({ enum: REVIEW_RATINGS })
  @IsInt()
  @IsIn(REVIEW_RATINGS)
  rating!: ReviewRating;

  @ApiPropertyOptional({ nullable: true, type: String, maxLength: REVIEW_COMMENT_MAX, description: 'Trimmed; blank or null is none. On an edit, absent keeps it.' })
  @blankToNull
  @optional
  @IsString()
  @MaxLength(REVIEW_COMMENT_MAX)
  comment?: string | null;
}

export class CreateReviewDto extends UpdateReviewDto implements CreateReviewPayload {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;
}

export class SetReviewVisibilityDto implements SetReviewVisibilityPayload {
  @ApiProperty({ description: 'True hides it from the shop window; false publishes it again.' })
  @IsBoolean()
  hidden!: boolean;
}

export class MarkReviewsSeenDto implements Omit<MarkReviewsSeenPayload, 'until'> {
  @ApiPropertyOptional({ format: 'date-time', description: "The newest review the owner's screen received; absent is now." })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  until?: Date;
}

// `@Type(() => Number)` and not the pipe's implicit conversion — apps/api/AGENTS.md, rule 6.
class ReviewPageDto {
  @ApiPropertyOptional({ minimum: 1, maximum: REVIEWS_PAGE_MAX, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(REVIEWS_PAGE_MAX)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: REVIEWS_PAGE_SIZE_MAX, description: `${PUBLIC_REVIEWS_PAGE_SIZE} on the shop window, ${STORE_REVIEWS_PAGE_SIZE} in the panel.` })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(REVIEWS_PAGE_SIZE_MAX)
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({ enum: REVIEW_RATINGS, description: 'Only this rating.' })
  @IsOptional()
  @IsInt()
  @IsIn(REVIEW_RATINGS)
  @Type(() => Number)
  rating?: ReviewRating;
}

/** A page of a product's published reviews: 10 by default. */
export class PublicReviewListDto extends ReviewPageDto implements PublicReviewListQuery {}

/** A page of the shop's reviews: 20 by default. */
export class StoreReviewListDto extends ReviewPageDto implements StoreReviewListQuery {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @blankToNull
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ enum: REVIEW_STATUSES, description: 'Absent is both.' })
  @IsOptional()
  @blankToNull
  @IsIn(REVIEW_STATUSES)
  status?: StoreReviewStatus;
}
