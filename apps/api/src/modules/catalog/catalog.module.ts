// Nest
import { Module } from '@nestjs/common';

// App
import { StoresModule } from '../stores/stores.module.js';
import { CatalogSlugService } from './catalog-slug.service.js';
import { ProductCategoriesController } from './product-categories.controller.js';
import { ProductCategoriesService } from './product-categories.service.js';
import { ProductsController } from './products.controller.js';
import { StorefrontController } from './storefront.controller.js';
import { ProductsService } from './products.service.js';

/**
 * The catalogue: the shopkeeper's categories and the things they sell.
 *
 * It imports StoresModule for `StoresService.ownedStoreId` rather than re-deriving who owns what —
 * the ownership rule has one place to be right, which is the whole reason that method is public.
 * PrismaModule is global, so it is not listed.
 */
@Module({
  imports: [StoresModule],
  controllers: [StorefrontController, ProductCategoriesController, ProductsController],
  providers: [CatalogSlugService, ProductCategoriesService, ProductsService],
  exports: [ProductCategoriesService, ProductsService],
})
export class CatalogModule {}
