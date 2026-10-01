// Nest
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

// Types
import type { PublicProductReviews } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { PublicReviewListDto } from './dto/review.dto.js';
import { PublicProductReviewsResponse } from './dto/review.response.js';
import { StoreReviewsService } from './store-reviews.service.js';

/** A product's published reviews, for anyone reading its page: open, like the catalogue. */
@ApiTags('reviews')
@Public()
@Controller('stores/:storeSlug/products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviews: StoreReviewsService) {}

  @Get()
  @ApiOperation({ summary: "A product's published reviews: the summary of all of them, and a page, the most recent first" })
  @ApiOkResponse({ type: PublicProductReviewsResponse })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · PRODUCT_NOT_FOUND — a draft, another shop’s, or none' })
  page(@Param('storeSlug') storeSlug: string, @Param('productId') productId: string, @Query() query: PublicReviewListDto): Promise<PublicProductReviews> {
    return this.reviews.publicPage(storeSlug, productId, query);
  }
}
