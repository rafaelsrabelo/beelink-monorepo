// Nest
import { Module } from '@nestjs/common';

// App
import { ComponentsController } from './components.controller.js';
import { SectionsController } from './page.controller.js';
import { PageComponentMovesService } from './page-component-moves.service.js';
import { PageComponentsService } from './page-components.service.js';
import { PageRules } from './page.rules.js';
import { PageService } from './page.service.js';
import { LandingReadService } from './landing-read.service.js';
import { PagesController, PublicLandingsController } from './pages.controller.js';
import { PageVersionsController } from './page-versions.controller.js';
import { PageVersionsService } from './page-versions.service.js';
import { PagesService } from './pages.service.js';
import { ShowcaseRules } from './showcase.rules.js';
import { StoresModule } from '../stores/stores.module.js';

@Module({
  imports: [StoresModule],
  controllers: [SectionsController, ComponentsController, PagesController, PageVersionsController, PublicLandingsController],
  providers: [PageService, PageComponentsService, PageComponentMovesService, PagesService, PageVersionsService, LandingReadService, PageRules, ShowcaseRules],
})
export class PageModule {}
