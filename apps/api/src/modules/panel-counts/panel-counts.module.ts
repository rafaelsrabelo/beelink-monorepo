// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { PanelCountsController } from './panel-counts.controller.js';
import { PanelCountsService } from './panel-counts.service.js';

/**
 * The panel menu's counts (BEELINK-309). StoresModule for who owns the shop; PrismaModule is global.
 * It imports no area's module: each area lends it a counting function, not a service.
 */
@Module({
  imports: [StoresModule],
  controllers: [PanelCountsController],
  providers: [PanelCountsService],
})
export class PanelCountsModule {}
