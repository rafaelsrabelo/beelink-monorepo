// App
import { ApiValidationPipe } from '../../../shared/http/api-validation.pipe.js';
import { BillingAccountDto } from './billing-account.dto.js';

// Types
import type { BillingErrorCode } from '@harness-monorepo/contracts';

/** The pipe as `app.setup.ts` builds it: what a body meets before the controller. */
const pipe = new ApiValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { exposeUnsetFields: false },
});

const check = (body: object) => pipe.transform(body, { type: 'body', metatype: BillingAccountDto }) as Promise<BillingAccountDto>;

type Refusal = { response: { errorCode?: string; message: string[] } };

const refusalOf = async (body: object) => (await check(body).catch((error: unknown) => error)) as Refusal;

/** Made up. The CPF is the textbook one; the CNPJ checks out and is nobody's. */
const typed = { name: 'Zuleica Tavares', document: '529.982.247-25' };

const NAME_SENTENCE = 'Informe o nome completo ou a razão social, com 2 a 120 caracteres.';
const DOCUMENT_SENTENCE = 'CPF ou CNPJ inválido: confira os números digitados.';

describe('BillingAccountDto', () => {
  it('hands over what the table keeps: the name trimmed with one space between words, the document as its digits', async () => {
    expect(await check({ name: '  Zuleica \t Tavares   Brandão ', document: ' 529.982.247-25 ' })).toEqual({ name: 'Zuleica Tavares Brandão', document: '52998224725' });
  });

  it.each([
    ['52998224725', '52998224725'],
    ['529.982.247-25', '52998224725'],
    ['529 982 247 25', '52998224725'],
    ['11222333000181', '11222333000181'],
    ['11.222.333/0001-81', '11222333000181'],
  ])('reads the document %j as %s', async (document, kept) => {
    expect((await check({ ...typed, document })).document).toBe(kept);
  });

  it.each(['Li', 'Petrobras', 'Lessari Moda LTDA', 'José da Silva Júnior 12345678900', 'a'.repeat(120), '😀'.repeat(120), '李四'])('takes the name %j: a company may be one word, and nobody is asked for a surname', async (name) => {
    expect((await check({ ...typed, name })).name).toBe(name);
  });

  describe('refuses, each field with its own code and a sentence in Portuguese', () => {
    const refusals: [string, Record<string, unknown>, BillingErrorCode, string][] = [
      ['a name of one letter', { name: 'Z' }, 'BILLING_NAME_INVALID', NAME_SENTENCE],
      // One character to Postgres, two to JavaScript's `length`.
      ['a name of one emoji', { name: '😀' }, 'BILLING_NAME_INVALID', NAME_SENTENCE],
      ['a name of spaces', { name: '    ' }, 'BILLING_NAME_INVALID', NAME_SENTENCE],
      ['a name of one letter and spaces', { name: '  Z  ' }, 'BILLING_NAME_INVALID', NAME_SENTENCE],
      ['a name past the column', { name: 'a'.repeat(121) }, 'BILLING_NAME_INVALID', NAME_SENTENCE],
      ['a name that is no text', { name: 42 }, 'BILLING_NAME_INVALID', NAME_SENTENCE],
      ['a name that is a list', { name: ['Zuleica', 'Tavares'] }, 'BILLING_NAME_INVALID', NAME_SENTENCE],
      ['a name that is null', { name: null }, 'BILLING_NAME_INVALID', NAME_SENTENCE],
      ['a CPF with a wrong check digit', { document: '529.982.247-26' }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
      ['a CPF of one digit repeated', { document: '111.111.111-11' }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
      ['a CPF too short', { document: '5299822472' }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
      ['a CNPJ with a wrong check digit', { document: '11.222.333/0001-82' }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
      ['a CNPJ of one digit repeated', { document: '00.000.000/0000-00' }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
      ['thirteen digits', { document: '1122233300018' }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
      ['a document sent as a number', { document: 52998224725 }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
      ['a document with letters among its digits', { document: '5299822472a' }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
      // A CNPJ issued since July 2026 may hold letters; the check here is the digits' one, and it is refused.
      ['a CNPJ with letters', { document: '12.ABC.345/01DE-35' }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
      ['an empty document', { document: '' }, 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
    ];

    it.each(refusals)('%s', async (_what, change, errorCode, sentence) => {
      const { response } = await refusalOf({ ...typed, ...change });

      expect(response.errorCode).toBe(errorCode);
      // One sentence a field, said once.
      expect(response.message).toEqual([sentence]);
    });

    it.each([
      ['name', 'BILLING_NAME_INVALID', NAME_SENTENCE],
      ['document', 'BILLING_DOCUMENT_INVALID', DOCUMENT_SENTENCE],
    ] as const)('a body with no %s, with that field\'s code', async (field, errorCode, sentence) => {
      const { [field]: _left, ...rest } = typed;
      const { response } = await refusalOf(rest);

      expect(response.errorCode).toBe(errorCode);
      expect(response.message).toEqual([sentence]);
    });

    it("an empty body, with the first field's code and both sentences", async () => {
      const { response } = await refusalOf({});

      expect(response.errorCode).toBe('BILLING_NAME_INVALID');
      expect(response.message).toEqual([NAME_SENTENCE, DOCUMENT_SENTENCE]);
    });
  });

  /** The e-mail is the account's own, and the customer's id at Asaas is nobody's to send. */
  it.each(['email', 'phone', 'asaasCustomerId', 'customerReady', 'documentType'])('refuses a body that names %s', async (field) => {
    const { response } = await refusalOf({ ...typed, [field]: 'x' });

    expect(response.message.join(' ')).toContain(`property ${field} should not exist`);
  });
});
