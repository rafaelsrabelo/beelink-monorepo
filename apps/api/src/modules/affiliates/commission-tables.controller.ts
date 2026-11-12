// Nest
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { CommissionProductRate, CommissionTable } from '@harness-monorepo/contracts';

// App
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { CommissionTablesService } from './commission-tables.service.js';
import { CommissionProductRateDto, CommissionTableDto } from './dto/affiliate-program.dto.js';
import { CommissionProductRateResponse, CommissionTableResponse } from './dto/affiliate-program.response.js';

/** The shop's commission tables and each product's own rate on one (IMPULSEIA-101). The list is the programme's overview. */
@ApiTags('affiliates')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND · COMMISSION_TABLE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN · PAGE_LOCKED' })
@Controller('stores/:storeSlug/affiliate-program/tables')
export class CommissionTablesController {
  constructor(private readonly tables: CommissionTablesService) {}

  @Post()
  @ApiOperation({ summary: 'A new table — a special condition for the affiliates put on it' })
  @ApiCreatedResponse({ type: CommissionTableResponse })
  @ApiBadRequestResponse({ description: 'COMMISSION_TABLE_INVALID' })
  @ApiConflictResponse({ description: 'COMMISSION_TABLE_NAME_TAKEN · COMMISSION_TABLE_LIMIT' })
  create(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Body() dto: CommissionTableDto): Promise<CommissionTable> {
    return this.tables.create(storeSlug, current.id, dto);
  }

  @Get(':tableId')
  @ApiOperation({ summary: 'A table, with the products that have a rate of their own on it' })
  @ApiOkResponse({ type: CommissionTableResponse })
  read(@Param('storeSlug') storeSlug: string, @Param('tableId') tableId: string, @CurrentUser() current: AuthenticatedUser): Promise<CommissionTable> {
    return this.tables.read(storeSlug, current.id, tableId);
  }

  @Put(':tableId')
  @ApiOperation({ summary: "A table's name and rate, whole. Orders placed from now on are worked out at it" })
  @ApiOkResponse({ type: CommissionTableResponse })
  @ApiBadRequestResponse({ description: 'COMMISSION_TABLE_INVALID' })
  @ApiConflictResponse({ description: 'COMMISSION_TABLE_NAME_TAKEN' })
  update(
    @Param('storeSlug') storeSlug: string,
    @Param('tableId') tableId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CommissionTableDto,
  ): Promise<CommissionTable> {
    return this.tables.update(storeSlug, current.id, tableId, dto);
  }

  @Delete(':tableId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a table and its rates. The default one stays' })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'COMMISSION_TABLE_DEFAULT' })
  async remove(@Param('storeSlug') storeSlug: string, @Param('tableId') tableId: string, @CurrentUser() current: AuthenticatedUser): Promise<void> {
    await this.tables.remove(storeSlug, current.id, tableId);
  }

  @Put(':tableId/rates/:productId')
  @ApiOperation({ summary: "A product's own rate on the table, which replaces the table's for it; 0 pays it nothing" })
  @ApiOkResponse({ type: CommissionProductRateResponse })
  @ApiBadRequestResponse({ description: 'COMMISSION_TABLE_INVALID' })
  @ApiNotFoundResponse({ description: 'PRODUCT_NOT_FOUND' })
  setRate(
    @Param('storeSlug') storeSlug: string,
    @Param('tableId') tableId: string,
    @Param('productId') productId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: CommissionProductRateDto,
  ): Promise<CommissionProductRate> {
    return this.tables.setRate(storeSlug, current.id, tableId, productId, dto);
  }

  @Delete(':tableId/rates/:productId')
  @HttpCode(204)
  @ApiOperation({ summary: "Back to the table's rate for the product" })
  @ApiNoContentResponse()
  async removeRate(
    @Param('storeSlug') storeSlug: string,
    @Param('tableId') tableId: string,
    @Param('productId') productId: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<void> {
    await this.tables.removeRate(storeSlug, current.id, tableId, productId);
  }
}
