// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { CustomersModule } from '../customers/customers.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';
import { CustomerConversationsController } from './customer-conversations.controller.js';

/**
 * An order's conversation between its customer and the shop (BEELINK-160). StoresModule for who owns
 * the shop; CustomersModule and AuthModule for the shopper's record and door; PrismaModule is global.
 */
@Module({
  imports: [StoresModule, CustomersModule, AuthModule, RealtimeModule],
  controllers: [ConversationsController, CustomerConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
