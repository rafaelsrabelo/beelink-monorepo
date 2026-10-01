// Nest
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { CustomerDataExport } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { Public } from '../auth/auth.decorators.js';
import { CustomerAuthGuard, type AuthenticatedCustomer } from './customer-auth.guard.js';
import { CustomerPrivacyService } from './customer-privacy.service.js';
import { CurrentCustomer } from './customer.decorators.js';
import { CustomerDataExportResponse, DeleteCustomerAccountDto } from './dto/customer-privacy.dto.js';

/** Keyed by IP, as the password's door is: a confirmation is a password to guess, and the copy is every order at once. */
const rateLimit = { max: env.AUTH_RATE_LIMIT_MAX, timeWindow: env.AUTH_RATE_LIMIT_WINDOW };

/** "Baixar meus dados" and "Excluir minha conta" (BEELINK-152): the shopper's, behind their own door. */
@ApiTags('customers')
@ApiBearerAuth()
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiUnauthorizedResponse({ description: "AUTH_UNAUTHENTICATED — no shopper's token, a shopkeeper's, or another shop's" })
@Public()
@UseGuards(CustomerAuthGuard)
@Controller('stores/:storeSlug/customer/me')
export class CustomerPrivacyController {
  constructor(private readonly privacy: CustomerPrivacyService) {}

  @Get('data')
  // Every order and conversation at once: the heaviest read a shopper can ask for.
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: 'Everything this shop keeps about the shopper, in one file' })
  @ApiOkResponse({ type: CustomerDataExportResponse })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  exportData(@Param('storeSlug') storeSlug: string, @CurrentCustomer() customer: AuthenticatedCustomer): Promise<CustomerDataExport> {
    return this.privacy.exportOf(storeSlug, customer.userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RouteConfig({ rateLimit })
  @ApiOperation({ summary: "End the shopper's account at this shop; the shop keeps its orders, forgetting the rest" })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'AUTH_PASSWORD_WRONG, or CUSTOMER_DELETE_EMAIL_MISMATCH for an account with no password' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED' })
  async deleteAccount(
    @Param('storeSlug') storeSlug: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: DeleteCustomerAccountDto,
  ): Promise<void> {
    await this.privacy.deleteAccount(storeSlug, customer.userId, dto);
  }
}
