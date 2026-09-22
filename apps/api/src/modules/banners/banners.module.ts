// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { BannersController } from './banners.controller.js';
import { BannersService } from './banners.service.js';

/** The shop's posters. It leans on StoresModule for the one ownership check every handler makes. */
@Module({
  imports: [StoresModule],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
