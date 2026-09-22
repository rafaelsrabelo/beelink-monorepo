// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { SectionsController } from './sections.controller.js';
import { SectionsService } from './sections.service.js';

/** The shop's posters. It leans on StoresModule for the one ownership check every handler makes. */
@Module({
  imports: [StoresModule],
  controllers: [SectionsController],
  providers: [SectionsService],
})
export class SectionsModule {}
