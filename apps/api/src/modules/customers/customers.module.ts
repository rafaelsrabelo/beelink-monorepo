// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomerAuthGuard } from './customer-auth.guard.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

/** A shopper's door into a shop, and the shop's record of them. */
@Module({
  imports: [AuthModule, StoresModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerAuthGuard],
})
export class CustomersModule {}
