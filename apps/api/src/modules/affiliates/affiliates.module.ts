// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { AffiliatesController } from './affiliates.controller.js';
import { AffiliatesService } from './affiliates.service.js';
import { CommissionTablesController } from './commission-tables.controller.js';
import { CommissionTablesService } from './commission-tables.service.js';

/**
 * A shop's affiliates (IMPULSEIA-100). AF1 (IMPULSEIA-101): the programme's rules and its commission
 * tables, as the owner keeps them. StoresModule for who owns the shop; PrismaModule is global.
 */
@Module({
  imports: [StoresModule],
  controllers: [AffiliatesController, CommissionTablesController],
  providers: [AffiliatesService, CommissionTablesService],
})
export class AffiliatesModule {}
