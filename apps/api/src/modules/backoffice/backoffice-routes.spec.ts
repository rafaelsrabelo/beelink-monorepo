// Nest
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, INTERCEPTORS_METADATA, METHOD_METADATA, MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';

// Types
import type { AuditedActions } from './backoffice.request.js';

// App
import { AppModule } from '../../app.module.js';
import { IS_PUBLIC_KEY } from '../auth/auth.decorators.js';
import { BACKOFFICE_AUDIT_ACTIONS } from './audit/audit.actions.js';
import { AuditInterceptor } from './audit/audit.interceptor.js';
import { BackofficeAuthController } from './auth/backoffice-auth.controller.js';
import { BackofficeGuard } from './backoffice.guard.js';
import { BackofficeModule } from './backoffice.module.js';
import { AUDITED_KEY, UNAUDITED_KEY } from './backoffice.request.js';

/**
 * The backoffice's rules, held over every controller the application declares — today's and the
 * ones the next tickets add (BEELINK-227). Nothing here is a list to keep up by hand but the two
 * exceptions, which are meant to be read by whoever changes them.
 */

interface Controller {
  name: string;
  prototype: object;
}
type ModuleRef = { module?: unknown; forwardRef?: () => unknown };

const READS: readonly RequestMethod[] = [RequestMethod.GET, RequestMethod.HEAD, RequestMethod.OPTIONS];

/** The sign-in itself is the one controller under `/backoffice` with no session to ask for yet. */
const THE_DOOR = BackofficeAuthController;
/** Its handlers that run with nobody signed in. Everything else there is behind the guard. */
const OPEN_AT_THE_DOOR = ['refresh', 'signIn', 'verify'];
/** Every backoffice write that leaves no audit line. Adding one is a decision: say why in `@Unaudited`. */
const UNAUDITED_WRITES = ['BackofficeAuthController.refresh'];

function moduleOf(entry: unknown): unknown {
  const ref = entry as ModuleRef;
  if (typeof ref === 'object' && ref !== null) return ref.module ?? ref.forwardRef?.();
  return entry;
}

/** Every module reachable from `root`, itself included. */
function modulesUnder(root: unknown, seen = new Set<unknown>()): Set<unknown> {
  const module = moduleOf(root);
  if (typeof module !== 'function' || seen.has(module)) return seen;
  seen.add(module);
  for (const imported of (Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) as unknown[] | undefined) ?? []) modulesUnder(imported, seen);
  return seen;
}

function controllersOf(module: unknown): Controller[] {
  return (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, module as object) as Controller[] | undefined) ?? [];
}

function pathsOf(controller: Controller): string[] {
  const path = Reflect.getMetadata(PATH_METADATA, controller) as string | string[] | undefined;
  return [path ?? ''].flat().map((one) => one.replace(/^\//, ''));
}

function isUnderBackoffice(controller: Controller): boolean {
  return pathsOf(controller).some((path) => path === 'backoffice' || path.startsWith('backoffice/'));
}

interface Handler {
  name: string;
  method: RequestMethod;
  fn: object;
}

function handlersOf(controller: Controller): Handler[] {
  const prototype = controller.prototype as Record<string, unknown>;
  return Object.getOwnPropertyNames(prototype)
    .map((name) => ({ name, fn: prototype[name] }))
    .filter((entry): entry is { name: string; fn: object } => typeof entry.fn === 'function' && Reflect.hasMetadata(METHOD_METADATA, entry.fn))
    .map(({ name, fn }) => ({ name, fn, method: Reflect.getMetadata(METHOD_METADATA, fn) as RequestMethod }));
}

const uses = (key: string, target: object, what: unknown): boolean => ((Reflect.getMetadata(key, target) as unknown[] | undefined) ?? []).includes(what);

const everyController = [...modulesUnder(AppModule)].flatMap(controllersOf);
const backoffice = everyController.filter(isUnderBackoffice);
const named = (controllers: Controller[]) => controllers.map((controller) => controller.name).sort();

describe('every controller under /backoffice', () => {
  it('is found: the walk reaches the module', () => {
    expect(named(backoffice)).toEqual(expect.arrayContaining(['AdminsController', 'AuditController', 'BackofficeAuthController', 'BackofficeMeController']));
  });

  it('is declared by BackofficeModule, and BackofficeModule declares nothing outside /backoffice', () => {
    expect(named(controllersOf(BackofficeModule))).toEqual(named(backoffice));
    expect(pathsOf(THE_DOOR)).toEqual(['backoffice/auth']);
  });

  it('stands behind BackofficeGuard — all but the sign-in itself', () => {
    const unguarded = backoffice.filter((controller) => !uses(GUARDS_METADATA, controller, BackofficeGuard));

    expect(named(unguarded)).toEqual([THE_DOOR.name]);
  });

  it('opens at the door only what signing in needs', () => {
    const open = handlersOf(THE_DOOR).filter((handler) => !uses(GUARDS_METADATA, handler.fn, BackofficeGuard));

    expect(open.map((handler) => handler.name).sort()).toEqual(OPEN_AT_THE_DOOR);
  });

  it('is opened to the global guard, which would refuse this door\'s token', () => {
    const closed = backoffice.filter((controller) => Reflect.getMetadata(IS_PUBLIC_KEY, controller) !== true);

    expect(named(closed)).toEqual([]);
  });

  it('goes through AuditInterceptor', () => {
    const unwatched = backoffice.filter((controller) => !uses(INTERCEPTORS_METADATA, controller, AuditInterceptor));

    expect(named(unwatched)).toEqual([]);
  });
});

describe('every backoffice write', () => {
  const writes = backoffice.flatMap((controller) =>
    handlersOf(controller)
      .filter((handler) => !READS.includes(handler.method))
      .map((handler) => ({ id: `${controller.name}.${handler.name}`, fn: handler.fn })),
  );

  it('exists: the walk reads the handlers', () => {
    expect(writes.map((write) => write.id)).toEqual(expect.arrayContaining(['AdminsController.grant', 'AdminsController.revoke', 'BackofficeAuthController.signIn']));
  });

  it('declares the action it records with @Audited, or says with @Unaudited why it records none', () => {
    const silent = writes.filter((write) => !Reflect.hasMetadata(AUDITED_KEY, write.fn) && !Reflect.hasMetadata(UNAUDITED_KEY, write.fn));

    expect(silent.map((write) => write.id)).toEqual([]);
  });

  it('is exempt only where this list says so', () => {
    const exempt = writes.filter((write) => Reflect.hasMetadata(UNAUDITED_KEY, write.fn));

    expect(exempt.map((write) => write.id).sort()).toEqual(UNAUDITED_WRITES);
    for (const write of exempt) expect(String(Reflect.getMetadata(UNAUDITED_KEY, write.fn)).length).toBeGreaterThan(20);
  });

  it('declares only action codes the contract knows', () => {
    const declared = writes.flatMap((write) => (Reflect.getMetadata(AUDITED_KEY, write.fn) as AuditedActions | undefined) ?? []);

    expect(declared.length).toBeGreaterThan(0);
    for (const action of declared) expect(BACKOFFICE_AUDIT_ACTIONS).toContain(action);
  });
});

describe('the rest of the API', () => {
  it('uses neither the backoffice\'s guard nor its path', () => {
    const outside = everyController.filter((controller) => !backoffice.includes(controller));
    const borrowing = outside.filter(
      (controller) => uses(GUARDS_METADATA, controller, BackofficeGuard) || handlersOf(controller).some((handler) => uses(GUARDS_METADATA, handler.fn, BackofficeGuard)),
    );

    expect(outside.length).toBeGreaterThan(20);
    expect(named(borrowing)).toEqual([]);
  });
});
