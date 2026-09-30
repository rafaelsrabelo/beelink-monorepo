// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';

/**
 * The shopper's favourites at a shop (BEELINK-153). CustomersModule for the shopper's record and
 * door; AuthModule for what the door checks a token against; PrismaModule is global.
 */
@Module({
  imports: [CustomersModule, AuthModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
