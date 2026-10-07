// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { BackofficeSession, BackofficeSignInChallenge } from '@harness-monorepo/contracts';

// App
import { PlatformAdminsService } from '../../src/modules/backoffice/admins/platform-admins.service.js';
import { AuditService } from '../../src/modules/backoffice/audit/audit.service.js';
import { PASSWORD, newEmail, register, verifyEmailOf } from './auth-flow.js';
import { waitForMessage } from './mailpit.js';

export const CODE_SUBJECT = 'Seu código de acesso ao backoffice';

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** A call with a bearer token, whoever's it is. */
export function callWith(app: NestFastifyApplication, method: Method, url: string, accessToken?: string, payload?: object) {
  return app.inject({ method, url, headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {}, ...(payload ? { payload } : {}) });
}

/** A verified bee-link account that is no administrator: a shopkeeper. */
export async function newAccount(app: NestFastifyApplication, label: string, name = 'Ana Souza'): Promise<{ id: string; email: string }> {
  const email = newEmail(label);
  const { id } = await register(app, email, name);
  await verifyEmailOf(app, email);
  return { id, email };
}

/** An administrator made the way the first one is: by the command's own path, with no administrator behind it. */
export async function newAdmin(app: NestFastifyApplication, label = 'admin'): Promise<{ id: string; email: string }> {
  const account = await newAccount(app, label);
  await app.get(PlatformAdminsService).grant(account.email, null, app.get(AuditService).commandTrail());
  return account;
}

/**
 * The code out of the inbox, the way a person reads it. `not` is a code already seen: an account
 * sent a second one waits for the e-mail that carries another.
 */
export async function codeSentTo(email: string, not?: string): Promise<string> {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const message = await waitForMessage(email, 10_000, CODE_SUBJECT);
    const code = /^([0-9]{6})$/m.exec(message.Text)?.[1];
    if (!code) throw new Error(`No code in the e-mail:\n${message.Text}`);
    if (code !== not) return code;
    if (Date.now() > deadline) throw new Error(`No second code reached ${email}`);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

export function signInStep(app: NestFastifyApplication, email: string, password = PASSWORD) {
  return app.inject({ method: 'POST', url: '/api/backoffice/auth/sign-in', payload: { email, password } });
}

export function verifyStep(app: NestFastifyApplication, challengeToken: string, code: string) {
  return app.inject({ method: 'POST', url: '/api/backoffice/auth/verify', payload: { challengeToken, code }, headers: { 'user-agent': 'e2e-browser' } });
}

/** Both steps, as a person takes them: the password, then the code from the inbox. */
export async function backofficeSignIn(app: NestFastifyApplication, email: string): Promise<BackofficeSession> {
  const first = await signInStep(app, email);
  if (first.statusCode !== 200) throw new Error(`backoffice sign-in answered ${first.statusCode}: ${first.payload}`);

  const second = await verifyStep(app, first.json<BackofficeSignInChallenge>().challengeToken, await codeSentTo(email));
  if (second.statusCode !== 200) throw new Error(`backoffice verify answered ${second.statusCode}: ${second.payload}`);
  return second.json<BackofficeSession>();
}

/** An administrator, signed in to the backoffice. */
export async function signedInAdmin(app: NestFastifyApplication, label = 'admin'): Promise<{ id: string; email: string; session: BackofficeSession }> {
  const admin = await newAdmin(app, label);
  return { ...admin, session: await backofficeSignIn(app, admin.email) };
}
