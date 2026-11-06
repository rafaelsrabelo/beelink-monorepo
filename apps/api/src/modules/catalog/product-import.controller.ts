// Nest
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Param,
  PayloadTooLargeException,
  Post,
  Req,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';

// Types
import type { FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { env } from '../../shared/config/env.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { ProductImportDto } from './dto/product-import.dto.js';
import { ProductImportExtractionResponse, ProductImportResultResponse } from './dto/product-import.response.js';
import { PRODUCT_IMPORT_MAX_BYTES, PRODUCT_IMPORT_TYPES, productImportError } from './product-import.constants.js';
import { importTypeOf } from './product-import.file.js';
import { ProductImportService } from './product-import.service.js';

/** Built here and not in the constants file, for the reason uploads.controller.ts gives about `env`. */
const readRateLimit = { max: env.PRODUCT_IMPORT_RATE_LIMIT_MAX, timeWindow: env.PRODUCT_IMPORT_RATE_LIMIT_WINDOW };

@ApiTags('catalog')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiNotFoundResponse({ description: 'STORE_NOT_FOUND' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN' })
@Controller('stores/:storeSlug/products/import')
export class ProductImportController {
  constructor(private readonly imports: ProductImportService) {}

  @Post('extract')
  @HttpCode(200)
  @RouteConfig({ rateLimit: readRateLimit })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] },
  })
  @ApiOperation({ summary: "Read a menu — a PDF or a photo — into drafts of products. Writes nothing" })
  @ApiOkResponse({ type: ProductImportExtractionResponse })
  @ApiUnsupportedMediaTypeResponse({ description: `UNSUPPORTED_MEDIA_TYPE — one of ${PRODUCT_IMPORT_TYPES.join(', ')}` })
  @ApiPayloadTooLargeResponse({ description: `PAYLOAD_TOO_LARGE — at most ${PRODUCT_IMPORT_MAX_BYTES} bytes` })
  @ApiUnprocessableEntityResponse({ description: 'PRODUCT_IMPORT_UNREADABLE' })
  @ApiBadGatewayResponse({ description: 'PRODUCT_IMPORT_UNAVAILABLE' })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — every read is billed' })
  async extract(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Req() request: FastifyRequest,
  ): Promise<ProductImportExtractionResponse> {
    this.imports.assertConfigured();

    const part = await request.file({ limits: { fileSize: PRODUCT_IMPORT_MAX_BYTES + 1, files: 1 } });
    if (!part) {
      throw new BadRequestException(productImportError('BAD_REQUEST', "Expected a multipart body with a file under 'file'"));
    }

    const bytes = await part.toBuffer();
    // How @fastify/multipart says it stopped at the limit; see uploads.controller.ts.
    if (part.file.truncated) {
      throw new PayloadTooLargeException(productImportError('PAYLOAD_TOO_LARGE', 'That file is over the size limit'));
    }

    const type = importTypeOf(bytes);
    if (!type) {
      throw new UnsupportedMediaTypeException(productImportError('UNSUPPORTED_MEDIA_TYPE', 'Send a PDF, or a PNG, JPEG or WebP image'));
    }

    return this.imports.extract(storeSlug, current.id, { bytes, type });
  }

  @Post()
  @ApiOperation({ summary: 'Create the confirmed products, on sale, with their categories and options, all or none' })
  @ApiCreatedResponse({ type: ProductImportResultResponse })
  @ApiBadRequestResponse({ description: 'PRODUCT_OPTION_DUPLICATE · CATALOG_SLUG_EMPTY · CATALOG_SLUG_RESERVED · BAD_REQUEST (over 100 products)' })
  @ApiNotFoundResponse({ description: 'PRODUCT_CATEGORY_NOT_FOUND' })
  @ApiConflictResponse({ description: 'PRODUCT_SLUG_TAKEN — a name the shop or this import already has · PRODUCT_CATEGORY_SLUG_TAKEN' })
  commit(
    @Param('storeSlug') storeSlug: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: ProductImportDto,
  ): Promise<ProductImportResultResponse> {
    return this.imports.commit(storeSlug, current.id, dto);
  }
}
