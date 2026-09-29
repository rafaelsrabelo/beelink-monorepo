// Libs
import { ValidateBy, buildMessage } from 'class-validator';
import type { ValidationOptions } from 'class-validator';

/**
 * Whether eleven digits are a CPF: not one digit repeated — `111.111.111-11` passes the arithmetic
 * and belongs to nobody — and both check digits right, each the sum of the digits before it
 * weighted from 10 (then 11) down to 2, times ten, modulo eleven, a ten counting as zero.
 */
export function isCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(digits[index]) * (length + 1 - index);
    return ((sum * 10) % 11) % 10;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

/** A CPF as the digits it is made of, whichever points and dash a person wrote around them. */
export function cpfDigitsOf(value: unknown): unknown {
  return typeof value === 'string' && /^[\d.\-\s]+$/.test(value) ? value.replace(/\D/g, '') : value;
}

export function IsCpf(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isCpf',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isCpf(value),
        defaultMessage: buildMessage((each) => `${each}$property must be a valid CPF`, options),
      },
    },
    options,
  );
}
