// App
import { claimsOfIdToken, codeChallengeOf, GoogleOAuthClient, newCodeVerifier, newState } from './google-oauth.client.js';

const CLIENT = 'app.apps.googleusercontent.com';
const NOW = 1_800_000_000;

/** An id_token as Google shapes one; unsigned, as the claims are what is read. */
function idToken(claims: Record<string, unknown>): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${part({ alg: 'RS256' })}.${part({ iss: 'https://accounts.google.com', aud: CLIENT, exp: NOW + 600, sub: '1234', email: 'Bia@Exemplo.com', email_verified: true, name: 'Bia', ...claims })}.assinatura`;
}

describe('claimsOfIdToken', () => {
  it("reads the person from a token for this app, the e-mail as accounts store it", () => {
    expect(claimsOfIdToken(idToken({}), CLIENT, NOW)).toEqual({ sub: '1234', email: 'bia@exemplo.com', emailVerified: true, authoritative: false, name: 'Bia' });
  });

  it('says Google owns the address only for Gmail or a Workspace domain, and only once verified', () => {
    expect(claimsOfIdToken(idToken({ email: 'bia@gmail.com' }), CLIENT, NOW)?.authoritative).toBe(true);
    expect(claimsOfIdToken(idToken({ hd: 'exemplo.com' }), CLIENT, NOW)?.authoritative).toBe(true);
    expect(claimsOfIdToken(idToken({}), CLIENT, NOW)?.authoritative).toBe(false);
    expect(claimsOfIdToken(idToken({ email: 'bia@gmail.com', email_verified: false }), CLIENT, NOW)?.authoritative).toBe(false);
  });

  it('refuses a token for another app, from another issuer, or past its expiry', () => {
    expect(claimsOfIdToken(idToken({ aud: 'outro-app' }), CLIENT, NOW)).toBeNull();
    expect(claimsOfIdToken(idToken({ iss: 'https://evil.example' }), CLIENT, NOW)).toBeNull();
    expect(claimsOfIdToken(idToken({ exp: NOW - 1 }), CLIENT, NOW)).toBeNull();
    expect(claimsOfIdToken('nao-e-um-token', CLIENT, NOW)).toBeNull();
  });

  it('says whether Google vouches for the e-mail, and names someone without a name by the address', () => {
    expect(claimsOfIdToken(idToken({ email_verified: false }), CLIENT, NOW)?.emailVerified).toBe(false);
    expect(claimsOfIdToken(idToken({ email_verified: 'true' }), CLIENT, NOW)?.emailVerified).toBe(true);
    expect(claimsOfIdToken(idToken({ name: undefined }), CLIENT, NOW)?.name).toBe('bia');
  });
});

describe('PKCE and state', () => {
  // S256: base64url of the verifier's SHA-256, unpadded — checked against Web Crypto's own digest.
  it('hashes the verifier as S256 asks', async () => {
    const verifier = newCodeVerifier();
    const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url');

    expect(codeChallengeOf(verifier)).toBe(digest);
    expect(codeChallengeOf(verifier)).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('draws a fresh verifier within 43–128 characters, and a fresh state, every time', () => {
    const verifier = newCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(newCodeVerifier()).not.toBe(verifier);
    expect(newState()).not.toBe(newState());
  });
});

describe('GoogleOAuthClient.authorizationUrl', () => {
  it("asks for the code with the state and the S256 challenge, back to the fixed address", () => {
    const url = new URL(new GoogleOAuthClient().authorizationUrl({ clientId: CLIENT, clientSecret: 's', redirectUri: 'https://bee.link/api/customer/google/callback' }, { state: 'st', codeChallenge: 'ch' }));

    expect(url.origin).toBe('https://accounts.google.com');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: CLIENT,
      redirect_uri: 'https://bee.link/api/customer/google/callback',
      response_type: 'code',
      scope: 'openid email profile',
      state: 'st',
      code_challenge: 'ch',
      code_challenge_method: 'S256',
    });
  });
});
