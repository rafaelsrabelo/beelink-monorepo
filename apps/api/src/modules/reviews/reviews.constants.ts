// Types
import type { ReviewErrorCode, ReviewRating, StoreReviewStatus } from '@harness-monorepo/contracts';

export const REVIEW_RATINGS = [1, 2, 3, 4, 5] as const satisfies readonly ReviewRating[];
export const REVIEW_STATUSES = ['PUBLISHED', 'HIDDEN'] as const satisfies readonly StoreReviewStatus[];
export const REVIEW_COMMENT_MAX = 1000;

export const PUBLIC_REVIEWS_PAGE_SIZE = 10;
export const STORE_REVIEWS_PAGE_SIZE = 20;
export const REVIEWS_PAGE_SIZE_MAX = 50;
export const REVIEWS_PAGE_MAX = 10_000;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function reviewError(errorCode: ReviewErrorCode, message: string): { errorCode: ReviewErrorCode; message: string } {
  return { errorCode, message };
}
