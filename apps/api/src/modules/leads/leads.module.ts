// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { ContactController } from './contact.controller.js';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';

/**
 * What a site's contact form receives.
 *
 * StoresModule for the two ownership questions — who may read, and which site a form belongs to.
 * MailModule is global; PrismaModule too, so neither is listed.
 */
@Module({
  imports: [StoresModule],
  controllers: [ContactController, LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
