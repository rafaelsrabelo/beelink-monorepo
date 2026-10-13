// Nest
import { Module } from '@nestjs/common';

// App
import { CourierApplicationMailer } from './courier-application-mailer.js';
import { CourierApplicationsController } from './courier-applications.controller.js';
import { CourierApplicationsService } from './courier-applications.service.js';

/**
 * The couriers' side of Beelink, of which the list of who asked to deliver is all there is so far.
 * `CourierApplicationMailer` is the outbox of the e-mail an application is owed (BEELINK-326).
 *
 * PrismaModule and MailModule are global, so they are not listed.
 */
@Module({
  controllers: [CourierApplicationsController],
  providers: [CourierApplicationsService, CourierApplicationMailer],
})
export class CouriersModule {}
