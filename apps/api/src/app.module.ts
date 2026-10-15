// Nest
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

// Libs
import { LoggerModule } from 'nestjs-pino';

// App
import { HealthController } from './health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard.js';
import { AddressesModule } from './modules/addresses/addresses.module.js';
import { PaymentEventsModule } from './modules/payment-events/payment-events.module.js';
import { PageModule } from './modules/page/page.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { CustomDomainModule } from './modules/custom-domain/custom-domain.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { DeliveryModule } from './modules/delivery/delivery.module.js';
import { FavoritesModule } from './modules/favorites/favorites.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { CouriersModule } from './modules/couriers/couriers.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PanelCountsModule } from './modules/panel-counts/panel-counts.module.js';
import { PromotionsModule } from './modules/promotions/promotions.module.js';
import { CarrierTrackingModule } from './modules/carrier-tracking/carrier-tracking.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { PageLockGuard } from './modules/billing/page-lock.guard.js';
import { CashbackModule } from './modules/cashback/cashback.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { ReviewsModule } from './modules/reviews/reviews.module.js';
import { StoresModule } from './modules/stores/stores.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { env } from './shared/config/env.js';
import { MailModule } from './shared/mail/mail.module.js';
import { PrismaModule } from './shared/prisma/prisma.module.js';

// Types
import type { Options } from 'pino-http';

/**
 * What pino writes of a request: its method, address, headers and status — never its body, which is
 * where a person's CPF, e-mail or phone travels.
 *
 * Named and exported for the test that reads what a route leaves in the log (BEELINK-321): it boots
 * the application with these very options and swaps the destination alone.
 */
export const requestLogOptions = {
  level: env.LOG_LEVEL,
  // Pretty lines for a person at a terminal; JSON wherever a machine reads the logs.
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { singleLine: true } }
      : undefined,
  // A webhook's token is a secret of its shop as much as a session's is of its person (BEELINK-206).
  redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["asaas-access-token"]'],
} satisfies Options;

@Module({
  imports: [
    LoggerModule.forRoot({ pinoHttp: requestLogOptions }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    StoresModule,
    CustomDomainModule,
    PageModule,
    CatalogModule,
    CustomersModule,
    FavoritesModule,
    LeadsModule,
    CouriersModule,
    OrdersModule,
    ConversationsModule,
    RealtimeModule,
    ReviewsModule,
    PanelCountsModule,
    PromotionsModule,
    CashbackModule,
    BillingModule,
    DeliveryModule,
    CarrierTrackingModule,
    PaymentEventsModule,
    IntegrationsModule,
    ReportsModule,
    UploadsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Every route is closed unless it carries @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // And a page that does not pay closes its routes but its subscription's, a customer's account and
    // orders (BEELINK-223). After the session's, in this order: it reads who is asking.
    { provide: APP_GUARD, useClass: PageLockGuard },
  ],
})
export class AppModule {}
