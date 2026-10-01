// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { CouponsController } from './coupons.controller.js';
import { CouponsService } from './coupons.service.js';
import { PromotionsController } from './promotions.controller.js';
import { PromotionsService } from './promotions.service.js';

/**
 * A shop's promotions and coupons (BEELINK-190), as its owner keeps them. StoresModule for who owns
 * the shop; PrismaModule is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [PromotionsController, CouponsController],
  providers: [PromotionsService, CouponsService],
})
export class PromotionsModule {}
