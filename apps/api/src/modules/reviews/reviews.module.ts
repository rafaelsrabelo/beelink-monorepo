// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerReviewsController } from './customer-reviews.controller.js';
import { CustomerReviewsService } from './customer-reviews.service.js';
import { ProductReviewsController } from './product-reviews.controller.js';
import { StoreReviewsController } from './store-reviews.controller.js';
import { StoreReviewsService } from './store-reviews.service.js';

/**
 * Products' reviews (BEELINK-156): the shopper's door, the owner's and the shop window's.
 * CustomersModule and AuthModule for the shopper's record and door; StoresModule for who owns the
 * shop; PrismaModule is global.
 */
@Module({
  imports: [CustomersModule, AuthModule, StoresModule],
  controllers: [CustomerReviewsController, StoreReviewsController, ProductReviewsController],
  providers: [CustomerReviewsService, StoreReviewsService],
})
export class ReviewsModule {}
