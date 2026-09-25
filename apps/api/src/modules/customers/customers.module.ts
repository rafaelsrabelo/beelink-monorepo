// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerAuthGuard } from './customer-auth.guard.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { CustomerGoogleController } from './google/customer-google.controller.js';
import { CustomerGoogleService } from './google/customer-google.service.js';
import { GoogleOAuthClient } from './google/google-oauth.client.js';
import { StoreCustomersController } from './store-customers.controller.js';
import { StoreCustomersService } from './store-customers.service.js';

/** A shopper's doors into a shop — password and Google — the shop's record of them, and its owner's list. */
@Module({
  imports: [AuthModule, StoresModule],
  controllers: [CustomersController, StoreCustomersController, CustomerGoogleController],
  providers: [CustomersService, StoreCustomersService, CustomerAuthGuard, CustomerGoogleService, GoogleOAuthClient],
})
export class CustomersModule {}
