// Nest
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata, ValidationPipeOptions } from '@nestjs/common';

// Types
import type { ValidationError } from 'class-validator';

/**
 * The global `ValidationPipe`, answering a field's own `errorCode` when its constraint declares one.
 *
 * Nest answers every failed constraint with a 400 the filter can only name after the status,
 * `BAD_REQUEST`. A field a client has to tell apart — a width offered from a fixed list, say —
 * declares its code in the decorator's `context` (`@IsIn(SPANS, { context: { errorCode } })`), and
 * that code is what leaves. A failure that declares nothing is Nest's own answer, untouched.
 *
 * Before any of that, it refuses what no decorator can: text Postgres cannot store, and a body
 * nested deep enough to overflow the recursion class-transformer runs first. Both used to leave as
 * a 500 — the database's refusal, or a `RangeError` — for a body that was simply invalid.
 */
export class ApiValidationPipe extends ValidationPipe {
  constructor(options: ValidationPipeOptions) {
    super(options);

    const nestAnswer = this.exceptionFactory;

    this.exceptionFactory = (errors: ValidationError[]) => {
      const answer: unknown = nestAnswer(errors);
      const errorCode = declaredCodeOf(errors);

      if (!errorCode || !(answer instanceof BadRequestException)) return answer;

      const { message } = answer.getResponse() as { message?: unknown };
      return new BadRequestException({ errorCode, message });
    };
  }

  override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
    refuseUnstorable(value);
    return super.transform(value, metadata);
  }
}

/** The first code a failed constraint declares, depth first, so a nested DTO's field counts too. */
function declaredCodeOf(errors: readonly ValidationError[]): string | undefined {
  for (const error of errors) {
    for (const context of Object.values(error.contexts ?? {})) {
      const code: unknown = (context as { errorCode?: unknown } | undefined)?.errorCode;
      if (typeof code === 'string') return code;
    }

    const nested = declaredCodeOf(error.children ?? []);
    if (nested) return nested;
  }

  return undefined;
}

/** Half of a UTF-16 pair with no other half — what `String.prototype.isWellFormed` refuses. */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/** Deeper than any body this API reads, and far short of where the recursive transform overflows. */
const MAX_DEPTH = 32;

/**
 * Walks a body without recursion and throws on what would reach the database as a 500.
 *
 * A NUL (U+0000) is refused by Postgres in text and in jsonb alike, and a lone UTF-16 surrogate is
 * refused in jsonb. Only plain objects and arrays are walked: a Buffer or a stream from an upload is
 * not a body anyone wrote by hand, and walking one would cost the size of the file.
 */
function refuseUnstorable(root: unknown): void {
  const stack: [unknown, number][] = [[root, 0]];

  while (stack.length) {
    const [value, depth] = stack.pop()!;

    if (typeof value === 'string') {
      if (value.includes('\u0000') || LONE_SURROGATE.test(value)) {
        throw new BadRequestException('Text holds a character that cannot be stored.');
      }
      continue;
    }

    if (!isWalkable(value)) continue;

    if (depth >= MAX_DEPTH) throw new BadRequestException('The body is nested too deeply.');

    for (const [key, child] of Object.entries(value)) {
      stack.push([key, depth + 1], [child, depth + 1]);
    }
  }
}

function isWalkable(value: unknown): value is object {
  if (Array.isArray(value)) return true;
  if (value === null || typeof value !== 'object') return false;

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
