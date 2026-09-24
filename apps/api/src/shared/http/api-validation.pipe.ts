// Nest
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationPipeOptions } from '@nestjs/common';

// Types
import type { ValidationError } from 'class-validator';

/**
 * The global `ValidationPipe`, answering a field's own `errorCode` when its constraint declares one.
 *
 * Nest answers every failed constraint with a 400 the filter can only name after the status,
 * `BAD_REQUEST`. A field a client has to tell apart — a width offered from a fixed list, say —
 * declares its code in the decorator's `context` (`@IsIn(SPANS, { context: { errorCode } })`), and
 * that code is what leaves. A failure that declares nothing is Nest's own answer, untouched.
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
