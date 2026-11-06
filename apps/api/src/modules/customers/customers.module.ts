// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { RealtimePublisherModule } from '../realtime/realtime-publisher.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerAddressesController } from './customer-addresses.controller.js';
import { CustomerAddressesService } from './customer-addresses.service.js';
import { CustomerAuthGuard } from './customer-auth.guard.js';
import { CustomerCheckoutController } from './customer-checkout.controller.js';
import { CustomerCheckoutService } from './customer-checkout.service.js';
import { CustomerPurchaseController } from './customer-purchase.controller.js';
import { CustomerPurchaseService } from './customer-purchase.service.js';
import { Buyers } from './buyers.service.js';
import { CustomerPrivacyController } from './customer-privacy.controller.js';
import { CustomerPrivacyService } from './customer-privacy.service.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { CustomerGoogleController } from './google/customer-google.controller.js';
import { CustomerGoogleService } from './google/customer-google.service.js';
import { GoogleOAuthClient } from './google/google-oauth.client.js';
import { StoreCustomersController } from './store-customers.controller.js';
import { StoreCustomersService } from './store-customers.service.js';

/**
 * A shopper's doors into a shop — password and Google — the shop's record of them and their addresses,
 * their data to take or end, and its owner's list. The publisher closes the sockets of an account deleted.
 */
@Module({
  imports: [AuthModule, StoresModule, RealtimePublisherModule],
  controllers: [CustomersController, CustomerCheckoutController, CustomerPurchaseController, CustomerAddressesController, CustomerPrivacyController, StoreCustomersController, CustomerGoogleController],
  providers: [CustomersService, CustomerCheckoutService, CustomerPurchaseService, Buyers, CustomerAddressesService, CustomerPrivacyService, StoreCustomersService, CustomerAuthGuard, CustomerGoogleService, GoogleOAuthClient],
  // The shopper's record and door, for the shopper's own orders.
  exports: [CustomersService, CustomerAuthGuard, Buyers],
})
export class CustomersModule {}
