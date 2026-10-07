// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { CouponsController } from './coupons.controller.js';
import { CouponsService } from './coupons.service.js';
import { PopupController } from './popup.controller.js';
import { PopupService } from './popup.service.js';
import { PromotionsController } from './promotions.controller.js';
import { PromotionsService } from './promotions.service.js';
import { StorefrontOffersController } from './storefront-offers.controller.js';

/**
 * A shop's promotions and coupons (BEELINK-190), as its owner keeps them — and what the shop window
 * says of them to anyone (`StorefrontOffersController`), its first-purchase pop-up among it
 * (`PopupController`, BEELINK-306). StoresModule for who owns the shop;
 * PrismaModule is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [PromotionsController, CouponsController, StorefrontOffersController, PopupController],
  providers: [PromotionsService, CouponsService, PopupService],
})
export class PromotionsModule {}
