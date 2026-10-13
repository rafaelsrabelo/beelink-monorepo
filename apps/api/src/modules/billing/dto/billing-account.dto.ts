// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { ValidateBy } from 'class-validator';

// App
import { IsCpfOrCnpj, documentDigitsOf } from '../../../shared/http/cnpj.js';
import { BILLING_NAME_MAX_LENGTH, BILLING_NAME_MIN_LENGTH } from '../billing.constants.js';

// Types
import type { BillingAccountPayload, BillingErrorCode } from '@harness-monorepo/contracts';

/**
 * A field's code and its sentence. The sentences are in Portuguese, the shopkeeper's language,
 * because BEELINK-291 asks it of these two; the code is still what a screen switches on.
 */
const refusing = (errorCode: BillingErrorCode, message: string) => ({ message, context: { errorCode } });

const NAME_REFUSAL = refusing('BILLING_NAME_INVALID', `Informe o nome completo ou a razão social, com ${BILLING_NAME_MIN_LENGTH} a ${BILLING_NAME_MAX_LENGTH} caracteres.`);
const DOCUMENT_REFUSAL = refusing('BILLING_DOCUMENT_INVALID', 'CPF ou CNPJ inválido: confira os números digitados.');

/** A name is kept as typed, less the spaces around it and with a run of them between words read as one. */
const collapsed = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value));

const documentDigits = Transform(({ value }: { value: unknown }) => documentDigitsOf(value));

/**
 * Text within the name's bounds, counted as Postgres counts a `VARCHAR`: in code points, so one emoji
 * is one character and not two. One constraint and not three: a field that fails is answered with one
 * sentence, not the same one for each rule it broke.
 */
const IsBillingName = (): PropertyDecorator =>
  ValidateBy(
    {
      name: 'isBillingName',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && [...value].length >= BILLING_NAME_MIN_LENGTH && [...value].length <= BILLING_NAME_MAX_LENGTH,
      },
    },
    NAME_REFUSAL,
  );

/**
 * Who bee-link charges for an account's pages. Each field is normalised first and checked after, so
 * what reaches the service is what the table keeps — and a document that does not check out is
 * refused here, before a row is written or Asaas is asked anything.
 *
 * No e-mail: it is the account's own. No phone and no address: Asaas asks neither of a customer who
 * pays at its invoice.
 */
export class BillingAccountDto implements BillingAccountPayload {
  @ApiProperty({
    example: 'Maria Souza Lima',
    minLength: BILLING_NAME_MIN_LENGTH,
    maxLength: BILLING_NAME_MAX_LENGTH,
    description: "A person's name or a company's. Kept trimmed, with one space between words. Refused with BILLING_NAME_INVALID.",
  })
  @collapsed
  @IsBillingName()
  name!: string;

  @ApiProperty({
    example: '529.982.247-25',
    description: 'A CPF or a CNPJ, with its points, dash and slash or without; kept as its digits. Its check digits are verified. Refused with BILLING_DOCUMENT_INVALID.',
  })
  @documentDigits
  @IsCpfOrCnpj(DOCUMENT_REFUSAL)
  document!: string;
}
