// Nest
import { Module } from '@nestjs/common';

// App
import { StoreCategoriesController } from './store-categories.controller.js';
import { StoreCategoriesService } from './store-categories.service.js';
import { StoreColorPresetsController } from './store-color-presets.controller.js';
import { StoreGeocoder } from './store-geocoder.service.js';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';

@Module({
  controllers: [StoresController, StoreCategoriesController, StoreColorPresetsController],
  providers: [StoresService, StoreCategoriesService, StoreGeocoder],
  exports: [StoresService],
})
export class StoresModule {}
