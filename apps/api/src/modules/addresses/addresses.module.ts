// Nest
import { Module } from '@nestjs/common';

// App
import { AddressSearchService } from './address-search.service.js';
import { AddressesController } from './addresses.controller.js';

@Module({
  controllers: [AddressesController],
  providers: [AddressSearchService],
  exports: [AddressSearchService],
})
export class AddressesModule {}
