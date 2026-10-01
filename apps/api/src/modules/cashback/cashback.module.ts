// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { CashbackController } from './cashback.controller.js';
import { CashbackService } from './cashback.service.js';
import { CustomerCashbackController } from './customer-cashback.controller.js';

/**
 * A shop's cashback (BEELINK-238): its rules and its customers' credit, as the owner keeps them.
 * What an order earns and spends goes through `cashback-ledger.ts`, inside the order's own
 * transaction. StoresModule for who owns the shop; PrismaModule is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [CashbackController, CustomerCashbackController],
  providers: [CashbackService],
})
export class CashbackModule {}
