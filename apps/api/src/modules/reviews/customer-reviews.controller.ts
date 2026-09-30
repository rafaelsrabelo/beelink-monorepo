// Nest
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { CustomerPendingReview, CustomerReview } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from '../customers/customer-auth.guard.js';
import { CurrentCustomer } from '../customers/customer.decorators.js';
import { CustomerReviewsService } from './customer-reviews.service.js';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto.js';
import { CustomerPendingReviewResponse, CustomerReviewResponse } from './dto/review.response.js';

/**
 * The shopper's reviews at a shop. `@Public()` to the global guard, which refuses a shopper's
 * token by design, and closed by `CustomerAuthGuard`, which refuses a shopkeeper's.
 */
@ApiTags('reviews')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/reviews')
export class CustomerReviewsController {
  constructor(private readonly reviews: CustomerReviewsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'The products the shop delivered to the shopper that they have not rated, each once' })
  @ApiOkResponse({ type: [CustomerPendingReviewResponse] })
  pending(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerPendingReview[]> {
    return this.reviews.pending(storeSlug, customer.userId);
  }

  @Get()
  @ApiOperation({ summary: 'The reviews the shopper wrote, the most recent first' })
  @ApiOkResponse({ type: [CustomerReviewResponse] })
  list(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerReview[]> {
    return this.reviews.list(storeSlug, customer.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Review a product the shop delivered to the shopper — published at once' })
  @ApiCreatedResponse({ type: CustomerReviewResponse })
  @ApiBadRequestResponse({ description: 'BAD_REQUEST — a rating outside 1 to 5, or a comment over 1000 characters' })
  @ApiForbiddenResponse({ description: 'CUSTOMER_REVIEW_NOT_ELIGIBLE — never delivered to them' })
  @ApiConflictResponse({ description: 'CUSTOMER_REVIEW_EXISTS — they edit the one they wrote' })
  create(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer, @Body() dto: CreateReviewDto): Promise<CustomerReview> {
    return this.reviews.create(storeSlug, customer.userId, dto);
  }

  @Put(':reviewId')
  @ApiOperation({ summary: 'Rewrite one of their reviews; one the shop hid stays hidden' })
  @ApiOkResponse({ type: CustomerReviewResponse })
  @ApiBadRequestResponse({ description: 'BAD_REQUEST — a rating outside 1 to 5, or a comment over 1000 characters' })
  @ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · CUSTOMER_REVIEW_NOT_FOUND' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('reviewId') reviewId: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: UpdateReviewDto,
  ): Promise<CustomerReview> {
    return this.reviews.update(storeSlug, customer.userId, reviewId, dto);
  }
}
