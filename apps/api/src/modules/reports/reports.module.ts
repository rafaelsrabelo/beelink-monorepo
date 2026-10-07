// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { FunnelRetention } from './funnel-retention.js';
import { FunnelService } from './funnel.service.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { StorefrontFunnelController } from './storefront-funnel.controller.js';

/**
 * What a shop sold, read back for its owner: sales by origin (BEELINK-275), and where the sales
 * numbers by period arrive. Of `orders` it only reads.
 *
 * And the shop's funnel (BEELINK-276), the one thing written here: `store_funnel_days`, anonymous
 * counters a shop window raises through its own public controller. `FunnelRetention` is exported for
 * the payments' routine, the clock that deletes the old days — it has no timer of its own.
 *
 * StoresModule for the ownership question; PrismaModule is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [ReportsController, StorefrontFunnelController],
  providers: [ReportsService, FunnelService, FunnelRetention],
  exports: [FunnelRetention],
})
export class ReportsModule {}
