// Nest
import { SetMetadata, createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:public';

/** Opens a route to callers with no bearer token. Everything else is closed by default. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthenticatedUser {
  id: string;
  sessionId: string;
}

/** The person behind the bearer token, put on the request by JwtAuthGuard. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
  if (!request.user) {
    throw new Error('CurrentUser used on a route that JwtAuthGuard did not authenticate');
  }
  return request.user;
});
