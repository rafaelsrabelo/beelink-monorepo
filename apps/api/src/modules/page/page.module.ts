// Nest
import { Module } from '@nestjs/common';

// App
import { ComponentsController, SectionsController } from './page.controller.js';
import { PageRules } from './page.rules.js';
import { PageService } from './page.service.js';
import { StoresModule } from '../stores/stores.module.js';

@Module({
  imports: [StoresModule],
  controllers: [SectionsController, ComponentsController],
  providers: [PageService, PageRules],
})
export class PageModule {}
