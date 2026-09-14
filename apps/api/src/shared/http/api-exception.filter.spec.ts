// Nest
import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

// App
import { ApiExceptionFilter } from './api-exception.filter.js';

function capture(exception: unknown): { status: unknown; body: unknown } {
  const reply = { status: vi.fn(), send: vi.fn() };
  reply.status.mockReturnValue(reply);
  const host = { switchToHttp: () => ({ getResponse: () => reply }) } as unknown as ArgumentsHost;

  new ApiExceptionFilter().catch(exception, host);

  return { status: reply.status.mock.calls[0]?.[0], body: reply.send.mock.calls[0]?.[0] };
}

describe('ApiExceptionFilter', () => {
  it('keeps the errorCode a service throws', () => {
    const { status, body } = capture(
      new ConflictException({ errorCode: 'AUTH_EMAIL_TAKEN', message: 'E-mail already registered' }),
    );

    expect(status).toBe(409);
    expect(body).toEqual({ statusCode: 409, errorCode: 'AUTH_EMAIL_TAKEN', message: 'E-mail already registered' });
  });

  it('falls back to the status name when no errorCode was given', () => {
    expect(capture(new NotFoundException()).body).toMatchObject({ statusCode: 404, errorCode: 'NOT_FOUND' });
  });

  it('joins the one-message-per-constraint array ValidationPipe throws', () => {
    const { body } = capture(new BadRequestException(['email must be an email', 'password is too short']));

    expect(body).toEqual({
      statusCode: 400,
      errorCode: 'BAD_REQUEST',
      message: 'email must be an email; password is too short',
    });
  });

  it('answers a bare 500 for anything that is not an HttpException, without leaking its message', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const { body } = capture(new Error('connect ECONNREFUSED 10.0.0.3:5432'));

    expect(body).toEqual({ statusCode: 500, errorCode: 'INTERNAL_ERROR', message: 'Internal server error' });
  });
});
