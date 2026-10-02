// Nest
import { Module } from '@nestjs/common';

// App
import { AddressesModule } from '../addresses/addresses.module.js';
import { StoresModule } from '../stores/stores.module.js';
import { DeliveryController } from './delivery.controller.js';
import { DeliveryService } from './delivery.service.js';
import { DestinationGeocoder } from './destination-geocoder.js';
import { ShippingQuoteController } from './shipping-quote.controller.js';
import { ShippingQuotes } from './shipping-quote.service.js';

/**
 * How a shop gets an order to its customer: the rules its owner sets (BEELINK-175), and the quote of
 * them to an address (BEELINK-176). Exported for the checkout, which places an order at the fee the
 * quote gives. StoresModule for who owns the shop and its geocoder, AddressesModule for MapTiler;
 * PrismaModule is global.
 */
@Module({
  imports: [StoresModule, AddressesModule],
  controllers: [DeliveryController, ShippingQuoteController],
  providers: [DeliveryService, ShippingQuotes, DestinationGeocoder],
  exports: [DeliveryService, ShippingQuotes],
})
export class DeliveryModule {}
