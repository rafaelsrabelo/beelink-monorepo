// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type {
  CustomerPendingReview,
  CustomerReview,
  PublicProductReviews,
  PublicReview,
  ReviewRating,
  StoreReview,
  StoreReviewPage,
} from '@harness-monorepo/contracts';

// App
import { REVIEW_RATINGS } from '../reviews.constants.js';

export class PublicReviewResponse implements PublicReview {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: REVIEW_RATINGS }) rating!: ReviewRating;
  @ApiProperty({ nullable: true, type: String }) comment!: string | null;
  @ApiProperty({ example: 'Rafael S.' }) authorName!: string;
  @ApiProperty({ nullable: true, type: String, example: 'Sabor: Uva' }) variantLabel!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

type Histogram = PublicProductReviews['summary']['histogram'];

export class ReviewHistogramResponse implements Histogram {
  @ApiProperty() '1'!: number;
  @ApiProperty() '2'!: number;
  @ApiProperty() '3'!: number;
  @ApiProperty() '4'!: number;
  @ApiProperty() '5'!: number;
}

export class ReviewSummaryResponse {
  @ApiProperty({ nullable: true, type: Number, example: 4.7, description: 'To one decimal; null while there is none.' }) average!: number | null;
  @ApiProperty() count!: number;
  @ApiProperty({ type: ReviewHistogramResponse }) histogram!: ReviewHistogramResponse;
}

export class PublicProductReviewsResponse implements PublicProductReviews {
  @ApiProperty({ type: ReviewSummaryResponse, description: 'The whole product, whatever the page or the filter.' }) summary!: ReviewSummaryResponse;
  @ApiProperty({ type: [PublicReviewResponse] }) reviews!: PublicReviewResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class CustomerPendingReviewResponse implements CustomerPendingReview {
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty({ nullable: true, type: String }) variantLabel!: string | null;
  @ApiProperty() orderNumber!: number;
  @ApiProperty({ format: 'date-time' }) deliveredAt!: string;
}

export class CustomerReviewResponse implements CustomerReview {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty({ nullable: true, type: String, description: 'Null once the product is a draft.' }) slug!: string | null;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: String }) imageUrl!: string | null;
  @ApiProperty({ enum: REVIEW_RATINGS }) rating!: ReviewRating;
  @ApiProperty({ nullable: true, type: String }) comment!: string | null;
  @ApiProperty({ nullable: true, type: String }) variantLabel!: string | null;
  @ApiProperty({ description: 'The shop hid it from the shop window.' }) hidden!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

class ReviewProductResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
}

class ReviewCustomerResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
}

export class StoreReviewResponse implements StoreReview {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: REVIEW_RATINGS }) rating!: ReviewRating;
  @ApiProperty({ nullable: true, type: String }) comment!: string | null;
  @ApiProperty({ nullable: true, type: String }) variantLabel!: string | null;
  @ApiProperty({ type: ReviewProductResponse }) product!: ReviewProductResponse;
  @ApiProperty({ type: ReviewCustomerResponse }) customer!: ReviewCustomerResponse;
  @ApiProperty() hidden!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

class StoreReviewCountsResponse implements Record<'ALL' | 'PUBLISHED' | 'HIDDEN', number> {
  @ApiProperty() ALL!: number;
  @ApiProperty() PUBLISHED!: number;
  @ApiProperty() HIDDEN!: number;
}

export class StoreReviewPageResponse implements StoreReviewPage {
  @ApiProperty({ type: [StoreReviewResponse] }) reviews!: StoreReviewResponse[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty({ type: StoreReviewCountsResponse, description: 'Following the rating and the product, not the status.' }) counts!: StoreReviewCountsResponse;
}
