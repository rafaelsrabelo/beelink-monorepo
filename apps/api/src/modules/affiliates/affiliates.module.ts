// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { AffiliateInvitationsService } from './affiliate-invitations.service.js';
import { AffiliateInvitesController } from './affiliate-invites.controller.js';
import { AffiliatesController } from './affiliates.controller.js';
import { AffiliatesService } from './affiliates.service.js';
import { CommissionTablesController } from './commission-tables.controller.js';
import { CommissionTablesService } from './commission-tables.service.js';
import { StoreAffiliatesController } from './store-affiliates.controller.js';
import { StoreAffiliatesService } from './store-affiliates.service.js';

/**
 * A shop's affiliates (IMPULSEIA-100). AF1 (IMPULSEIA-101): the programme's rules and its commission
 * tables. AF3 (IMPULSEIA-103): the affiliates the owner invites, and the invite as the person
 * invited accepts it. StoresModule for who owns the shop; AuthModule for the session an account made
 * by an invite opens with. PrismaModule and MailModule are global.
 */
@Module({
  imports: [StoresModule, AuthModule],
  controllers: [AffiliatesController, CommissionTablesController, StoreAffiliatesController, AffiliateInvitesController],
  providers: [AffiliatesService, CommissionTablesService, StoreAffiliatesService, AffiliateInvitationsService],
})
export class AffiliatesModule {}
