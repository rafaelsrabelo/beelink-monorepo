// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { AffiliateDocumentSweeper } from './affiliate-document-sweeper.js';
import { AffiliateDocumentsController } from './affiliate-documents.controller.js';
import { AffiliateDocumentsService } from './affiliate-documents.service.js';
import { AffiliateRegistrationService } from './affiliate-registration.service.js';
import { AffiliateAreaController } from './affiliate-area.controller.js';
import { AffiliateAreaService } from './affiliate-area.service.js';
import { AffiliateCommissionSweeper } from './affiliate-commission-sweeper.js';
import { AffiliateMoneyController } from './affiliate-money.controller.js';
import { AffiliateMoneyService } from './affiliate-money.service.js';
import { AffiliateOrderChangesService } from './affiliate-order-changes.service.js';
import { AffiliatePayoutMailer } from './affiliate-payout-mailer.js';
import { AffiliateInvitationsService } from './affiliate-invitations.service.js';
import { AffiliateLinksService } from './affiliate-links.service.js';
import { AffiliateSaleMailer } from './affiliate-sale-mailer.js';
import { AffiliateInvitesController } from './affiliate-invites.controller.js';
import { AffiliatesController } from './affiliates.controller.js';
import { AffiliatesService } from './affiliates.service.js';
import { CommissionTablesController } from './commission-tables.controller.js';
import { CommissionTablesService } from './commission-tables.service.js';
import { StoreAffiliatesController } from './store-affiliates.controller.js';
import { StoreAffiliatesService } from './store-affiliates.service.js';
import { StorefrontAffiliatesController } from './storefront-affiliates.controller.js';

/**
 * A shop's affiliates (IMPULSEIA-100). AF1 (IMPULSEIA-101): the programme's rules and its commission
 * tables. AF3 (IMPULSEIA-103): the affiliates the owner invites, and the invite as the person
 * invited accepts it. AF5 (IMPULSEIA-105): the link on the shop window and the visits it brings.
 * AF6 (IMPULSEIA-106): the clock's part of an order's commission — falling due — and the e-mails a
 * sale owes; what an order does to it goes through `affiliate-orders.ts`, inside the order's own
 * transaction. AF7 (IMPULSEIA-107): the shop's money — whom an order is credited to, each affiliate's
 * statement, adjustments and payouts, and what is owed by due day. AF8 (IMPULSEIA-108): the
 * affiliate's own area — what an account reads of the shops it sells for — and the e-mail a payout owes.
 * Since the user's review of 12/11/2026: an affiliate's own commission, and their identity document,
 * whose photos UploadsModule keeps privately. StoresModule for who owns the shop; AuthModule for the session an account made
 * by an invite opens with. PrismaModule and MailModule are global.
 */
@Module({
  imports: [StoresModule, AuthModule, UploadsModule],
  controllers: [AffiliatesController, CommissionTablesController, StoreAffiliatesController, AffiliateInvitesController, StorefrontAffiliatesController, AffiliateMoneyController, AffiliateAreaController, AffiliateDocumentsController],
  providers: [
    AffiliatesService,
    CommissionTablesService,
    StoreAffiliatesService,
    AffiliateInvitationsService,
    AffiliateLinksService,
    AffiliateCommissionSweeper,
    AffiliateSaleMailer,
    AffiliateMoneyService,
    AffiliateOrderChangesService,
    AffiliatePayoutMailer,
    AffiliateAreaService,
    AffiliateRegistrationService,
    AffiliateDocumentsService,
    AffiliateDocumentSweeper,
  ],
})
export class AffiliatesModule {}
