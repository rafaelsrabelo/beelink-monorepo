// Libs
import { ValidateBy, buildMessage } from 'class-validator';
import type { ValidationOptions } from 'class-validator';

/**
 * `@MaxLength`, counted the way Postgres counts a `VARCHAR(n)`: in code points.
 *
 * validator.js's `isLength` counts a character and the variation selector after it (U+FE0F, the
 * one that makes ❤ an emoji) as one, and Postgres counts two. Sixty-one hearts passed a title
 * bounded at 120 and overflowed the column, which answered a 500 for a body the API had accepted.
 */
export function MaxCodePoints(max: number, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxCodePoints',
      constraints: [max],
      validator: {
        validate: (value: unknown) => typeof value === 'string' && [...value].length <= max,
        defaultMessage: buildMessage(
          (each) => `${each}$property must be shorter than or equal to $constraint1 characters`,
          options,
        ),
      },
    },
    options,
  );
}
