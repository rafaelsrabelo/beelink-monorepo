// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

/** A shop's orders. StoresModule for who owns the shop; PrismaModule is global, so it is not listed. */
@Module({
  imports: [StoresModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
