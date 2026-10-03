// Libs
import { ValidateBy, buildMessage } from 'class-validator';
import type { ValidationOptions } from 'class-validator';

// App
import { isCpf } from './cpf.js';

/**
 * Whether fourteen digits are a CNPJ: not one digit repeated, and both check digits right — each the
 * sum of the digits before it weighted 2 to 9 from the right, cycling, modulo eleven, under two
 * counting as zero and otherwise eleven minus it.
 */
export function isCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(digits[length - 1 - index]) * ((index % 8) + 2);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}

/** A CPF or a CNPJ as the digits it is made of, whichever points, dash and slash a person wrote around them. */
export function documentDigitsOf(value: unknown): unknown {
  return typeof value === 'string' && /^[\d.\-/\s]+$/.test(value) ? value.replace(/\D/g, '') : value;
}

/** A CPF (11 digits) or a CNPJ (14) whose check digits hold: who a shop is, to the carriers. */
export function IsCpfOrCnpj(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isCpfOrCnpj',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && (isCpf(value) || isCnpj(value)),
        defaultMessage: buildMessage((each) => `${each}$property must be a valid CPF or CNPJ`, options),
      },
    },
    options,
  );
}
