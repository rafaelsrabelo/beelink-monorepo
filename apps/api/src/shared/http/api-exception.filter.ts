// Nest
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';

// Types
import type { ApiErrorBody } from '@harness-monorepo/contracts';
import type { FastifyReply } from 'fastify';

/**
 * Every error leaves in one shape, `ApiErrorBody`. `errorCode` is what clients switch on, so it is
 * never parsed out of `message`: a service that means a specific code throws `{ errorCode, message }`
 * as the exception's response, and everything else falls back to the status name (`NOT_FOUND`).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const body = this.toBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(exception);
    }

    void reply.status(body.statusCode).send(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_ERROR',
        message: 'Internal server error',
      };
    }

    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    const fallbackCode: string = HttpStatus[statusCode] ?? 'HTTP_ERROR';

    if (typeof response === 'string') {
      return { statusCode, errorCode: fallbackCode, message: response };
    }

    const { errorCode, message, details } = response as {
      errorCode?: unknown;
      message?: unknown;
      details?: unknown;
    };

    return {
      statusCode,
      errorCode: typeof errorCode === 'string' ? errorCode : fallbackCode,
      // ValidationPipe answers one message per failed constraint.
      message: Array.isArray(message)
        ? message.join('; ')
        : typeof message === 'string'
          ? message
          : exception.message,
      // Only a service's own refusal carries it, and only as an object: never a framework's detail.
      ...(typeof errorCode === 'string' && typeof details === 'object' && details !== null ? { details } : {}),
    };
  }
}
