// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';

/*
  What bee-link's billing commands have in common (BEELINK-224, BEELINK-297): run from a terminal in the
  API's container — `node dist/scripts/<name>.js` — while no screen does their work. Each command's own
  file says what it does; this one says how a command is asked, answers and exits.
*/

/** Where a command writes: the terminal it was run in. Nothing it writes is a log line. */
export interface CommandOutput {
  out: (line: string) => void;
  err: (line: string) => void;
}

/** Done; refused (what was asked cannot be done, and nothing was written); asked wrongly. */
export const COMMAND_EXIT = { done: 0, refused: 1, usage: 2 } as const;

/** Asked wrongly: the command says how it is used. */
export class UsageError extends Error {}

/** Refused: why is said, and nothing was written. */
export class Refusal extends Error {}

/** A command's subcommands, each handed the arguments after its name. */
export type Subcommands = Record<string, (args: readonly string[]) => Promise<void>>;

const HELP = new Set(['help', '--help', '-h']);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** `--name value` or `--name=value`, each at most once; anything else is asked wrongly. */
export function optionsOf(args: readonly string[], allowed: readonly string[]): Map<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? '';
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!match?.[1] || !allowed.includes(match[1])) throw new UsageError(`Unknown argument: ${arg}`);
    const value = match[2] ?? args[(index += 1)];
    if (value === undefined || value === '') throw new UsageError(`--${match[1]} needs a value`);
    if (options.has(match[1])) throw new UsageError(`--${match[1]} was given twice`);
    options.set(match[1], value);
  }
  return options;
}

/** The value of an option a day is typed in, `YYYY-MM-DD`, its shape alone checked; whether it names a day is the caller's to say. */
export function dayShaped(name: string, typed: string): string {
  if (!DAY.test(typed)) throw new Refusal(`--${name} must be a day as YYYY-MM-DD: got "${typed}".`);
  return typed;
}

async function settled(work: () => Promise<void>, usage: readonly string[], io: CommandOutput): Promise<number> {
  try {
    await work();
    return COMMAND_EXIT.done;
  } catch (error) {
    if (error instanceof UsageError) {
      io.err(error.message);
      for (const line of usage) io.err(line);
      return COMMAND_EXIT.usage;
    }
    if (error instanceof Refusal) {
      io.err(error.message);
      return COMMAND_EXIT.refused;
    }
    throw error;
  }
}

/**
 * A command made of subcommands, given its arguments (`process.argv` past the script). With none it
 * says how it is used and exits as asked wrongly; `help` says so and is done. Answers the exit code: a
 * fault that is neither a refusal nor a wrong question is thrown.
 */
export async function runSubcommands(argv: readonly string[], usage: readonly string[], commands: Subcommands, io: CommandOutput): Promise<number> {
  const [name, ...args] = argv;
  if (name === undefined || HELP.has(name)) {
    for (const line of usage) io.out(line);
    return name === undefined ? COMMAND_EXIT.usage : COMMAND_EXIT.done;
  }
  const command = Object.hasOwn(commands, name) ? commands[name] : undefined;
  if (!command) {
    io.err(`Unknown command: ${name}`);
    for (const line of usage) io.err(line);
    return COMMAND_EXIT.usage;
  }
  return settled(() => command(args), usage, io);
}

/** A command of options alone: `help` says how it is used, anything else is its options. */
export async function runOptions(argv: readonly string[], usage: readonly string[], work: (args: readonly string[]) => Promise<void>, io: CommandOutput): Promise<number> {
  if (argv[0] !== undefined && HELP.has(argv[0])) {
    for (const line of usage) io.out(line);
    return COMMAND_EXIT.done;
  }
  return settled(() => work(argv), usage, io);
}

/**
 * A script's whole life, for `src/scripts/`: the database opened, the command run with the terminal
 * for its output, the database closed, and the process left to exit with the command's code — 1 for a
 * fault, whose message alone is written.
 */
export async function runInTerminal(command: (db: PrismaService, io: CommandOutput) => Promise<number>): Promise<void> {
  const prisma = new PrismaService();
  let exitCode: number = COMMAND_EXIT.refused;
  try {
    await prisma.$connect();
    exitCode = await command(prisma, {
      out: (line) => process.stdout.write(`${line}\n`),
      err: (line) => process.stderr.write(`${line}\n`),
    });
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  } finally {
    await prisma.$disconnect();
  }
  process.exitCode = exitCode;
}
