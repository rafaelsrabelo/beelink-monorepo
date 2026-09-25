// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerAuthGuard } from './customer-auth.guard.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { StoreCustomersController } from './store-customers.controller.js';
import { StoreCustomersService } from './store-customers.service.js';

/** A shopper's door into a shop, the shop's record of them, and its owner's list of them. */
@Module({
  imports: [AuthModule, StoresModule],
  controllers: [CustomersController, StoreCustomersController],
  providers: [CustomersService, StoreCustomersService, CustomerAuthGuard],
})
export class CustomersModule {}
