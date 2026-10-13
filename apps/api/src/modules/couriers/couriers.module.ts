// Nest
import { Module } from '@nestjs/common';

// App
import { CourierApplicationsController } from './courier-applications.controller.js';
import { CourierApplicationsService } from './courier-applications.service.js';

/**
 * The couriers' side of Beelink, of which the list of who asked to deliver is all there is so far.
 *
 * PrismaModule is global, so it is not listed.
 */
@Module({
  controllers: [CourierApplicationsController],
  providers: [CourierApplicationsService],
})
export class CouriersModule {}
