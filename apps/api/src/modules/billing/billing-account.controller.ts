// Nest
import { Body, Controller, Get, Put } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Types
import type { BillingAccount, BillingAccountAnswer } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { BillingAccounts } from './billing-accounts.service.js';
import { BillingAccountDto } from './dto/billing-account.dto.js';
import { BillingAccountAnswerResponse, BillingAccountResponse } from './dto/billing.response.js';

/**
 * The shop writes' own pair, for their own reason: each save may call a third party — and here the
 * third party's quota is one for every shopkeeper.
 */
const writeRateLimit = { max: env.STORE_WRITE_RATE_LIMIT_MAX, timeWindow: env.STORE_WRITE_RATE_LIMIT_WINDOW };

/**
 * Who bee-link charges for an account's pages (BEELINK-291). The account's and not a page's: its
 * Asaas customer is one, whatever the number of pages, so no slug is in the address. Closed, like
 * every panel route — the global guard takes the shopkeeper's token and refuses a shopper's.
 */
@ApiTags('billing')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiServiceUnavailableResponse({ description: "BILLING_UNAVAILABLE — this deployment has no Asaas account of bee-link's own" })
@Controller('billing/account')
export class BillingAccountController {
  constructor(private readonly accounts: BillingAccounts) {}

  @Get()
  @ApiOperation({ summary: "The account's billing data — the name and the document, masked — and whether Asaas holds its customer. `account` is null for one that never gave it" })
  @ApiOkResponse({ type: BillingAccountAnswerResponse })
  read(@CurrentUser() current: AuthenticatedUser): Promise<BillingAccountAnswer> {
    return this.accounts.read(current.id);
  }

  @Put()
  @RouteConfig({ rateLimit: writeRateLimit })
  @ApiOperation({ summary: "Keep the name and the CPF or CNPJ bee-link charges, and make the account's customer at bee-link's own Asaas account match them — created once, found again after. Safe to repeat" })
  @ApiOkResponse({ type: BillingAccountResponse })
  @ApiBadRequestResponse({ description: 'BILLING_NAME_INVALID · BILLING_DOCUMENT_INVALID — nothing was kept, and Asaas was not asked' })
  @ApiConflictResponse({ description: 'BILLING_ACCOUNT_BUSY — another save of this account is being told to Asaas; nothing was kept' })
  @ApiBadGatewayResponse({ description: 'BILLING_CUSTOMER_REFUSED — Asaas refused the customer; the data was kept' })
  @ApiServiceUnavailableResponse({ description: 'BILLING_UNAVAILABLE · BILLING_UNREACHABLE — Asaas did not answer; the data was kept' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many writes from this address' })
  save(@CurrentUser() current: AuthenticatedUser, @Body() body: BillingAccountDto): Promise<BillingAccount> {
    return this.accounts.save(current.id, body);
  }
}
