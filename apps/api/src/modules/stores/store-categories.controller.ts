// Nest
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// App
import { StoreCategoryResponse } from './dto/store.response.js';
import { StoreCategoriesService } from './store-categories.service.js';

/**
 * Closed, not `@Public()`. The only caller in phase 1 is the panel's store form, and the storefront
 * renders no category today. Opening a route later is one line; closing one is a breaking change.
 */
@ApiTags('store-categories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@Controller('store-categories')
export class StoreCategoriesController {
  constructor(private readonly categories: StoreCategoriesService) {}

  @Get()
  @ApiOperation({ summary: "The platform's taxonomy of shops, by name" })
  @ApiOkResponse({ type: StoreCategoryResponse, isArray: true })
  all(): Promise<StoreCategoryResponse[]> {
    return this.categories.all();
  }
}
