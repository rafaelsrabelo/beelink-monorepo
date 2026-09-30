// Nest
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { StoreReview, StoreReviewPage } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { SetReviewVisibilityDto, StoreReviewListDto } from './dto/review.dto.js';
import { StoreReviewPageResponse, StoreReviewResponse } from './dto/review.response.js';
import { StoreReviewsService } from './store-reviews.service.js';

/**
 * The owner's side of the reviews: read them and hide what cannot stay. Closed, like every panel
 * route — the global guard takes the shopkeeper's token and refuses a shopper's.
 */
@ApiTags('reviews')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/reviews')
export class StoreReviewsController {
  constructor(private readonly reviews: StoreReviewsService) {}

  @Get()
  @ApiOperation({ summary: "The shop's reviews, the most recent first, by rating, product and status" })
  @ApiOkResponse({ type: StoreReviewPageResponse })
  list(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Query() query: StoreReviewListDto): Promise<StoreReviewPage> {
    return this.reviews.list(storeSlug, current.id, query);
  }

  @Patch(':reviewId')
  @ApiOperation({ summary: 'Hide a review from the shop window, or publish it again' })
  @ApiOkResponse({ type: StoreReviewResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · REVIEW_NOT_FOUND' })
  setVisibility(
    @Param('storeSlug') storeSlug: string,
    @Param('reviewId') reviewId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: SetReviewVisibilityDto,
  ): Promise<StoreReview> {
    return this.reviews.setVisibility(storeSlug, current.id, reviewId, dto);
  }
}
