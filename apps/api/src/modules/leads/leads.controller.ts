// Nest
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { CurrentUser } from '../auth/auth.decorators.js';
import { ListLeadsDto, UpdateLeadDto } from './dto/lead.dto.js';
import { LeadPageResponse, LeadResponse } from './dto/lead.response.js';
import { LeadsService } from './leads.service.js';

/** The owner's side: what came in, and where each one stands. Closed, like every panel route. */
@ApiTags('leads')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · LEAD_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @ApiOperation({ summary: "One page of the site's leads, newest first" })
  @ApiOkResponse({ type: LeadPageResponse })
  list(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Query() query: ListLeadsDto,
  ): Promise<LeadPageResponse> {
    return this.leads.list(storeSlug, current.id, query);
  }

  @Patch(':leadId')
  @ApiOperation({ summary: 'Where this lead stands now' })
  @ApiOkResponse({ type: LeadResponse })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('leadId') leadId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateLeadDto,
  ): Promise<LeadResponse> {
    return this.leads.updateStatus(storeSlug, current.id, leadId, dto);
  }

  @Delete(':leadId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Forget a lead for good' })
  @ApiNoContentResponse()
  remove(
    @Param('storeSlug') storeSlug: string,
    @Param('leadId') leadId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    return this.leads.remove(storeSlug, current.id, leadId);
  }
}
