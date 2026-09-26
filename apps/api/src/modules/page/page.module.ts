// Nest
import { Module } from '@nestjs/common';

// App
import { ComponentsController, SectionsController } from './page.controller.js';
import { PageComponentsService } from './page-components.service.js';
import { PageRules } from './page.rules.js';
import { PageService } from './page.service.js';
import { LandingReadService } from './landing-read.service.js';
import { PagesController, PublicLandingsController } from './pages.controller.js';
import { PagesService } from './pages.service.js';
import { ShowcaseRules } from './showcase.rules.js';
import { StoresModule } from '../stores/stores.module.js';

@Module({
  imports: [StoresModule],
  controllers: [SectionsController, ComponentsController, PagesController, PublicLandingsController],
  providers: [PageService, PageComponentsService, PagesService, LandingReadService, PageRules, ShowcaseRules],
})
export class PageModule {}
