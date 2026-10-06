// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { MetaPixelConnection } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../../auth/auth.decorators.js';
import { CurrentUser } from '../../auth/auth.decorators.js';
import { MetaPixelConnectDto } from './dto/meta-pixel.dto.js';
import { MetaPixelConnectionResponse } from './dto/meta-pixel.response.js';
import { MetaPixelService } from './meta-pixel.service.js';

/** A shop's Meta Pixel (BEELINK-269), as its owner saves it by its ID. Closed, like every panel route. */
@ApiTags('integrations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/integrations/meta-pixel')
export class MetaPixelController {
  constructor(private readonly pixel: MetaPixelService) {}

  @Get()
  @ApiOperation({ summary: "The shop's Meta Pixel: its ID and when it was saved, or disconnected" })
  @ApiOkResponse({ type: MetaPixelConnectionResponse })
  connection(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<MetaPixelConnection> {
    return this.pixel.connection(storeSlug, current.id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Save the shop's pixel ID, or replace the one saved: digits only, 10 to 20 — never a script. The shop's public data carries it from then on" })
  @ApiOkResponse({ type: MetaPixelConnectionResponse })
  @ApiBadRequestResponse({ description: 'META_PIXEL_ID_INVALID' })
  connect(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: MetaPixelConnectDto): Promise<MetaPixelConnection> {
    return this.pixel.connect(storeSlug, current.id, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove the shop's pixel: its public data stops carrying an ID" })
  @ApiNoContentResponse()
  disconnect(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser): Promise<void> {
    return this.pixel.disconnect(storeSlug, current.id);
  }
}
