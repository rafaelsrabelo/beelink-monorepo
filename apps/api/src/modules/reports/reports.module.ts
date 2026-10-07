// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

/**
 * What a shop sold, read back for its owner. One read today — sales by origin (BEELINK-275) — and
 * where the sales numbers by period arrive. It reads `orders` and writes nothing.
 *
 * StoresModule for the ownership question; PrismaModule is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
