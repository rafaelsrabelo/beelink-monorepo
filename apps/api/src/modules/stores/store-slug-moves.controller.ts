// Nest
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

// Types
import type { StoreSlugMove } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { StoreSlugMoveResponse } from './dto/store-slug.dto.js';
import { StoresService } from './stores.service.js';

/**
 * Which address a page left and which it has now (BEELINK-331), for the web to lead the old one to the
 * new. Beside `stores` and not under it, like `custom-domains`: `/stores/<anything>` is a shop's slug.
 *
 * Public and unlimited on purpose, as `custom-domains` is: the web asks with no session, over the
 * internal network — the API is not public — once a minute; and an old address is told to anyone who
 * visits it anyway.
 */
@ApiTags('stores')
@Controller('store-slug-moves')
export class StoreSlugMovesController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Every address a page left, with the one it has now' })
  @ApiOkResponse({ type: StoreSlugMoveResponse, isArray: true })
  all(): Promise<StoreSlugMove[]> {
    return this.stores.moves();
  }
}
