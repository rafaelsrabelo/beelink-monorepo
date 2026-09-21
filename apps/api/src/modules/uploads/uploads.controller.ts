// Nest
import {
  BadGatewayException,
  BadRequestException,
  Controller,
  HttpCode,
  NotImplementedException,
  PayloadTooLargeException,
  Post,
  Req,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnsupportedMediaTypeResponse,
} from '@nestjs/swagger';

// Types
import type { FastifyRequest } from 'fastify';

// App
import { env } from '../../shared/config/env.js';
import { CloudinaryService } from './cloudinary.service.js';
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from './uploads.constants.js';
import type { UploadErrorCode } from './uploads.constants.js';
import { UploadResponse } from './dto/upload.response.js';

/**
 * Harder than an ordinary write: an upload costs storage and bandwidth on someone's bill, where a
 * rejected slug costs a round trip. Built here rather than in the constants file for the reason
 * stores.controller.ts gives — reading `env` there would make a `.env` a condition of loading the
 * unit tests.
 */
const uploadRateLimit = { max: env.UPLOAD_RATE_LIMIT_MAX, timeWindow: env.UPLOAD_RATE_LIMIT_WINDOW };

/** Keeps every code this module answers inside the set the web has a sentence for. */
function uploadError(errorCode: UploadErrorCode, message: string): { errorCode: UploadErrorCode; message: string } {
  return { errorCode, message };
}

/**
 * The one place in the product where bytes are accepted.
 *
 * It is here and not behind the web app's BFF, where it first landed, because a BFF route cannot
 * decide who anybody is: it holds the session cookie but the token inside it is validated by this
 * API, on every call. A handler that checked only that a cookie was present would take a file from
 * anyone who set one, and bill it to this account.
 *
 * No `@Public()`, so the global guard applies: a valid bearer or nothing.
 */
@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post()
  @HttpCode(200)
  @ApiBearerAuth()
  @RouteConfig({ rateLimit: uploadRateLimit })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] },
  })
  @ApiOperation({ summary: 'Store one image and answer its public address' })
  @ApiOkResponse({ type: UploadResponse })
  @ApiUnauthorizedResponse({ description: 'AUTH_UNAUTHENTICATED' })
  @ApiUnsupportedMediaTypeResponse({ description: `UNSUPPORTED_MEDIA_TYPE — one of ${ACCEPTED_TYPES.join(', ')}` })
  @ApiPayloadTooLargeResponse({ description: `PAYLOAD_TOO_LARGE — at most ${MAX_UPLOAD_BYTES} bytes` })
  @ApiTooManyRequestsResponse({ description: 'RATE_LIMITED — too many uploads from this address' })
  async upload(@Req() request: FastifyRequest): Promise<UploadResponse> {
    const config = this.cloudinary.config();

    // Checked before the body is read: there is no reason to buffer megabytes that have nowhere to go.
    if (!config) {
      throw new NotImplementedException(
        uploadError('UPLOAD_NOT_CONFIGURED', 'No storage adapter is configured for uploads'),
      );
    }

    const part = await request.file({ limits: { fileSize: MAX_UPLOAD_BYTES + 1, files: 1 } });

    if (!part) {
      throw new BadRequestException(uploadError('BAD_REQUEST', "Expected a multipart body with a file under 'file'"));
    }

    const bytes = await part.toBuffer();

    // `truncated` is how @fastify/multipart reports that it stopped reading at the limit. Without
    // this the buffer arrives one byte short of the ceiling and passes a size check it failed.
    if (part.file.truncated) {
      throw new PayloadTooLargeException(uploadError('PAYLOAD_TOO_LARGE', 'That image is over the size limit'));
    }

    const uploaded = await this.cloudinary.upload(
      { bytes, type: part.mimetype, filename: part.filename },
      config,
    );

    switch (uploaded.status) {
      case 'uploaded':
        return UploadResponse.from(uploaded.url);
      case 'unsupported':
        throw new UnsupportedMediaTypeException(
          uploadError('UNSUPPORTED_MEDIA_TYPE', 'That image format is not accepted'),
        );
      case 'too-large':
        throw new PayloadTooLargeException(uploadError('PAYLOAD_TOO_LARGE', 'That image is over the size limit'));
      case 'unavailable':
        // 502 and not 500: this API is healthy and the shopkeeper chose a perfectly good picture —
        // the storage service did not take it. The sentence the panel shows says exactly that.
        throw new BadGatewayException(uploadError('BAD_GATEWAY', 'The storage service did not accept the upload'));
    }
  }
}
