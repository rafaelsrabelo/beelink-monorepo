// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { DeliveryController } from './delivery.controller.js';
import { DeliveryService } from './delivery.service.js';

/**
 * How a shop gets an order to its customer (BEELINK-175): the rules its owner sets. Exported for the
 * quote and the checkout, which read the same rules. StoresModule for who owns the shop; PrismaModule
 * is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
