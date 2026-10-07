// Node
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Types
import type { BackofficeAdmin, BackofficeAuditPage, BackofficeMe, BackofficeSession, BackofficeSignInChallenge } from '@harness-monorepo/contracts';
import type { BackofficeSignInChallengeModel, EmailTokenModel, RefreshTokenModel, StoreIntegrationModel, UserModel } from '../../generated/prisma/models.js';

/**
 * The backoffice never reads anyone's password or session (BEELINK-226). Its answers are built
 * field by field, and this holds the names of those fields: every `*.response.ts` under this
 * module — the ones the next tickets add too — and the contract's own types.
 */

/** A field named like one of these carries, or points at, something no administrator is shown. */
const FORBIDDEN = /pass(word)?|senha|hash|secret|sealed|token|session(s|Id)$|cookie|credential|^code$|codeHash|api[-_]?key/i;

/**
 * The one exception: the administrator's **own** backoffice session, answered to them at sign-in.
 * Nothing here is anybody else's, and none of it opens the panel or a shop.
 */
const OWN_SESSION: Record<string, string[]> = {
  BackofficeSignInChallengeResponse: ['challengeToken'],
  BackofficeSessionResponse: ['accessToken', 'accessTokenExpiresAt', 'refreshToken', 'refreshTokenExpiresAt'],
};

const HERE = fileURLToPath(new URL('.', import.meta.url));
/** What `@ApiProperty` leaves on a class: its documented fields, as `:name`. */
const SWAGGER_PROPERTIES = 'swagger/apiModelPropertiesArray';

function responseFiles(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) return responseFiles(path);
    return entry.name.endsWith('.response.ts') ? [path] : [];
  });
}

async function responseClasses(): Promise<{ name: string; fields: string[] }[]> {
  const found: { name: string; fields: string[] }[] = [];
  for (const file of responseFiles(HERE)) {
    const module = (await import(/* @vite-ignore */ pathToFileURL(file).href)) as Record<string, unknown>;
    for (const [name, exported] of Object.entries(module)) {
      if (typeof exported !== 'function') continue;
      const fields = ((Reflect.getMetadata(SWAGGER_PROPERTIES, exported.prototype as object) as string[] | undefined) ?? []).map((field) => field.replace(/^:/, ''));
      found.push({ name, fields });
    }
  }
  return found;
}

describe('what the backoffice answers', () => {
  it('is read from every response file there is', async () => {
    const classes = await responseClasses();

    expect(classes.map((one) => one.name)).toEqual(expect.arrayContaining(['BackofficeAdminResponse', 'BackofficeAuditEntryResponse', 'BackofficeMeResponse', 'BackofficeSessionResponse']));
    // A class with no documented field would pass every check below by saying nothing.
    expect(classes.filter((one) => one.fields.length === 0)).toEqual([]);
  });

  it('never names a password, a hash, a secret, a token or a session of somebody', async () => {
    const leaks = (await responseClasses()).flatMap(({ name, fields }) =>
      fields.filter((field) => FORBIDDEN.test(field) && !OWN_SESSION[name]?.includes(field)).map((field) => `${name}.${field}`),
    );

    expect(leaks).toEqual([]);
  });

  it('excepts the administrator\'s own session, and nothing that is not there any more', async () => {
    const classes = new Map((await responseClasses()).map((one) => [one.name, one.fields]));

    for (const [name, fields] of Object.entries(OWN_SESSION)) {
      expect(classes.get(name)).toEqual(expect.arrayContaining(fields));
    }
  });

  it('refuses the names it is there to refuse', () => {
    for (const field of ['passwordHash', 'password', 'tokenHash', 'codeHash', 'refreshToken', 'accessToken', 'sealedSecret', 'sessions', 'sessionId', 'emailTokens', 'apiKey', 'code']) {
      expect(field).toMatch(FORBIDDEN);
    }
    for (const field of ['id', 'userId', 'name', 'email', 'grantedAt', 'grantedBy', 'session', 'expiresAt', 'idleExpiresAt', 'action', 'details', 'ip', 'userAgent']) {
      expect(field).not.toMatch(FORBIDDEN);
    }
  });
});

/** Every key of a wire type, however deep. */
type KeysOf<T> = T extends readonly (infer Item)[] ? KeysOf<Item> : T extends object ? { [Key in keyof T & string]: Key | KeysOf<T[Key]> }[keyof T & string] : never;

/** The columns and relations of an account, a session and an integration that never cross this wire. */
type NeverAnswered =
  | 'password'
  | Extract<keyof UserModel, `password${string}`>
  | Extract<keyof RefreshTokenModel | keyof EmailTokenModel | keyof BackofficeSignInChallengeModel, `${string}Hash`>
  // A shop's sealed third-party access, by its column's own name — which only its folder may spell.
  | Extract<keyof StoreIntegrationModel, `secret${string}`>
  | 'sessions'
  | 'refreshTokens'
  | 'emailTokens';

/** What an administrator is shown of other people and of the platform — every contract type but their own session. */
type Shown = BackofficeMe | BackofficeAdmin | BackofficeAuditPage;
/** Their own session: its two tokens, and still none of the columns above. */
type OwnSession = BackofficeSession | BackofficeSignInChallenge;

describe('the backoffice contract', () => {
  it('carries no column of an account, a session or a sealed secret — checked by the compiler', () => {
    const shown: [Extract<KeysOf<Shown>, NeverAnswered | 'accessToken' | 'refreshToken'>] extends [never] ? true : false = true;
    const own: [Extract<KeysOf<OwnSession>, NeverAnswered>] extends [never] ? true : false = true;
    // The list is not empty by accident: it names the columns it is there for.
    const named: ['passwordHash' | 'tokenHash' | 'codeHash'] extends [NeverAnswered] ? true : false = true;

    expect([shown, own, named]).toEqual([true, true, true]);
  });
});
