// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, User } from '@harness-monorepo/contracts';

// App
import { tokenFromLink, waitForMessage } from './mailpit.js';

export const PASSWORD = 'uma-senha-bem-comprida';

let counter = 0;

/** A fresh address per call, so a test never inherits another's inbox. */
export function newEmail(label: string): string {
  counter += 1;
  return `${label}-${counter}-${process.pid}@exemplo.test`;
}

export async function register(app: NestFastifyApplication, email: string, name = 'Ana Souza'): Promise<User> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name, email, password: PASSWORD },
  });

  if (response.statusCode !== 201) throw new Error(`register answered ${response.statusCode}: ${response.payload}`);
  return response.json<User>();
}

/** Reads the verification link out of the inbox, like a person clicking it. */
export async function verifyEmailOf(app: NestFastifyApplication, email: string): Promise<void> {
  const message = await waitForMessage(email);
  const token = tokenFromLink(message.Text, '/verify-email');

  const response = await app.inject({ method: 'POST', url: '/api/auth/verify-email', payload: { token } });
  if (response.statusCode !== 204) throw new Error(`verify-email answered ${response.statusCode}: ${response.payload}`);
}

export async function login(app: NestFastifyApplication, email: string, password = PASSWORD): Promise<AuthSession> {
  const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
  if (response.statusCode !== 200) throw new Error(`login answered ${response.statusCode}: ${response.payload}`);
  return response.json<AuthSession>();
}

export async function signUpAndSignIn(app: NestFastifyApplication, email: string): Promise<AuthSession> {
  await register(app, email);
  await verifyEmailOf(app, email);
  return login(app, email);
}
