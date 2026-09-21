// Nest
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { StoreColorPreset } from '@harness-monorepo/contracts';

// App
import { StoreColorPresetResponse } from './dto/store.response.js';
import { STORE_COLOR_PRESETS } from './store-color-presets.constants.js';

/**
 * Closed, for the same reason `store-categories` is: the panel's shop form is the only caller, and
 * the storefront renders a shop's own colours rather than the list they were chosen from.
 *
 * No service behind it. A service holds a rule, and there is no rule here — the list is a constant,
 * so a service would be a file that forwards one array.
 */
@ApiTags('store-color-presets')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@Controller('store-color-presets')
export class StoreColorPresetsController {
  @Get()
  @ApiOperation({ summary: 'The palettes the panel applies in one click, in the order it offers them' })
  @ApiOkResponse({ type: StoreColorPresetResponse, isArray: true })
  all(): readonly StoreColorPreset[] {
    return STORE_COLOR_PRESETS;
  }
}
