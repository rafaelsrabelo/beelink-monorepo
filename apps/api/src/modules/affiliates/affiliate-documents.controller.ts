// Nest
import { BadRequestException, Body, Controller, Get, HttpCode, Param, PayloadTooLargeException, Post, Put, Req } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';

// Types
import type { AffiliateDocumentUpload, AffiliateDocumentView, ShopAffiliate } from '@harness-monorepo/contracts';
import type { FastifyRequest } from 'fastify';

// App
import { env } from '../../shared/config/env.js';
import type { AuthenticatedUser } from '../auth/auth.decorators.js';
import { CurrentUser } from '../auth/auth.decorators.js';
import { AffiliateDocumentsService } from './affiliate-documents.service.js';
import { DOCUMENT_MAX_BYTES } from './affiliates.constants.js';
import { AffiliateDocumentDto } from './dto/affiliate-commission.dto.js';
import { AffiliateDocumentUploadResponse, AffiliateDocumentViewResponse } from './dto/affiliate-document.response.js';
import { ShopAffiliateResponse } from './dto/affiliate.response.js';

/** As every upload: a file costs storage on someone's bill. */
const uploadRateLimit = { max: env.UPLOAD_RATE_LIMIT_MAX, timeWindow: env.UPLOAD_RATE_LIMIT_WINDOW };

/**
 * The photos of an affiliate's identity document (the user's review, 12/11/2026), for the shop's
 * owner alone: sent one at a time while the invite is filled in, named by the invite or the record,
 * and read through links that expire. Born closed to a page locked for want of payment.
 */
@ApiTags('affiliates')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
@ApiForbiddenResponse({ description: 'STORE_FORBIDDEN · PAGE_LOCKED' })
@Controller('stores/:storeSlug')
export class AffiliateDocumentsController {
  constructor(private readonly documents: AffiliateDocumentsService) {}

  @Post('affiliate-documents')
  @HttpCode(201)
  @RouteConfig({ rateLimit: uploadRateLimit })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  @ApiOperation({ summary: 'Keep one photo of a document privately, for an invite or a record to name within a day' })
  @ApiCreatedResponse({ type: AffiliateDocumentUploadResponse })
  @ApiUnsupportedMediaTypeResponse({ description: 'UNSUPPORTED_MEDIA_TYPE — a JPEG, PNG or WebP photo' })
  @ApiPayloadTooLargeResponse({ description: `PAYLOAD_TOO_LARGE — at most ${DOCUMENT_MAX_BYTES} bytes` })
  @ApiBadGatewayResponse({ description: 'BAD_GATEWAY' })
  async stage(@Param('storeSlug') storeSlug: string, @CurrentUser() current: AuthenticatedUser, @Req() request: FastifyRequest): Promise<AffiliateDocumentUpload> {
    const storeId = await this.documents.ready(storeSlug, current.id);
    const part = await request.file({ limits: { fileSize: DOCUMENT_MAX_BYTES + 1, files: 1 } });
    if (!part) throw new BadRequestException({ errorCode: 'BAD_REQUEST', message: "Expected a multipart body with a file under 'file'" });
    const bytes = await part.toBuffer();
    if (part.file.truncated) throw new PayloadTooLargeException({ errorCode: 'PAYLOAD_TOO_LARGE', message: 'That photo is over the size limit' });
    return this.documents.stage(storeId, { bytes, type: part.mimetype, filename: part.filename });
  }

  @Get('affiliates/:affiliateId/document')
  @ApiOperation({ summary: "The document's photos, at links that stop working in ten minutes" })
  @ApiOkResponse({ type: AffiliateDocumentViewResponse })
  @ApiNotFoundResponse({ description: 'AFFILIATE_NOT_FOUND · AFFILIATE_DOCUMENT_NOT_FOUND' })
  read(@Param('storeSlug') storeSlug: string, @Param('affiliateId') affiliateId: string, @CurrentUser() current: AuthenticatedUser): Promise<AffiliateDocumentView> {
    return this.documents.read(storeSlug, current.id, affiliateId);
  }

  @Put('affiliates/:affiliateId/document')
  @ApiOperation({ summary: 'Send the document, or send it again: the photos before are deleted' })
  @ApiOkResponse({ type: ShopAffiliateResponse })
  @ApiNotFoundResponse({ description: 'AFFILIATE_NOT_FOUND · AFFILIATE_DOCUMENT_UPLOAD_NOT_FOUND' })
  replace(
    @Param('storeSlug') storeSlug: string,
    @Param('affiliateId') affiliateId: string,
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: AffiliateDocumentDto,
  ): Promise<ShopAffiliate> {
    return this.documents.replace(storeSlug, current.id, affiliateId, dto);
  }
}
