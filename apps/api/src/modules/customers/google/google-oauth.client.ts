// Node
import { createHash, randomBytes } from 'node:crypto';

// Nest
import { Injectable } from '@nestjs/common';

// App
import { env } from '../../../shared/config/env.js';

/** What a finished Google sign-in says about the person. */
export interface GoogleClaims {
  /** Google's stable id for the person; the e-mail can change, this does not. */
  sub: string;
  /** Trimmed and lower-cased, as accounts store theirs. */
  email: string;
  emailVerified: boolean;
  /**
   * Whether Google owns the address outright: a Gmail one, or one in a Workspace domain (`hd`).
   * Otherwise `email_verified` only says the mailbox was checked when the Google account was made —
   * it may have changed hands since, so it proves too little to take over an existing account.
   */
  authoritative: boolean;
  name: string;
}

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** The deployment's Google setup, or null when it has none — then the shop window draws no button. */
export function googleConfig(): GoogleConfig | null {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_REDIRECT_URI: redirectUri } = env;
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** Sent to Google and back, and held in the browser's cookie: 256 random bits. */
export const newState = (): string => randomBytes(32).toString('base64url');

/** PKCE's secret half, kept here while its hash travels: 64 characters, inside RFC 7636's 43–128. */
export const newCodeVerifier = (): string => randomBytes(48).toString('base64url');

/** PKCE's public half, S256: what Google holds the code to until the verifier comes back with it. */
export const codeChallengeOf = (verifier: string): string => createHash('sha256').update(verifier).digest('base64url');

/**
 * The `id_token`'s claims, or null when it is not for this app or no longer good.
 *
 * Issuer, audience and expiry, and not the signature: the token comes straight from Google's token
 * endpoint, over TLS, in an exchange authenticated with this app's secret — the case OpenID Connect
 * (3.1.3.7) lets TLS stand in for the signature, which spares fetching and caching Google's keys.
 */
export function claimsOfIdToken(idToken: string, clientId: string, nowSeconds: number): GoogleClaims | null {
  const payload = idToken.split('.')[1];
  if (!payload) return null;

  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }

  const audience = claims.aud;
  const forThisApp = audience === clientId || (Array.isArray(audience) && audience.includes(clientId));
  const current = typeof claims.exp === 'number' && claims.exp > nowSeconds;
  if (!ISSUERS.includes(String(claims.iss)) || !forThisApp || !current) return null;
  if (typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string' || !claims.email.includes('@')) return null;

  const email = claims.email.trim().toLowerCase();
  const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.trim() : (email.split('@')[0] ?? email);
  // Google sends a boolean; an older shape sent the string.
  const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
  const authoritative = emailVerified && (email.endsWith('@gmail.com') || (typeof claims.hd === 'string' && claims.hd !== ''));

  return { sub: claims.sub, email, emailVerified, authoritative, name };
}

/**
 * Google's two ends of the authorization-code flow. A provider of its own so a test can stand a fake
 * Google in its place — one that holds each code to its PKCE challenge, as Google does.
 */
@Injectable()
export class GoogleOAuthClient {
  authorizationUrl(config: GoogleConfig, { state, codeChallenge }: { state: string; codeChallenge: string }): string {
    const url = new URL(AUTHORIZE_URL);
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      // The account picker, every time: a shared computer must not sign the next person in silently.
      prompt: 'select_account',
    }).toString();
    return url.toString();
  }

  /** The code traded for the person, with the verifier PKCE asks for; null when Google refuses it. */
  async exchange(config: GoogleConfig, code: string, codeVerifier: string): Promise<GoogleClaims | null> {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);

    if (!response?.ok) return null;
    const body = (await response.json().catch(() => null)) as { id_token?: unknown } | null;
    return typeof body?.id_token === 'string' ? claimsOfIdToken(body.id_token, config.clientId, Math.floor(Date.now() / 1000)) : null;
  }
}
