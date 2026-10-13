// App
import { ApiValidationPipe } from '../../../shared/http/api-validation.pipe.js';
import { CourierApplicationDto } from './courier-application.dto.js';

// Types
import type { CourierApplicationErrorCode } from '@harness-monorepo/contracts';

/** The pipe as `app.setup.ts` builds it: what a body meets before the controller. */
const pipe = new ApiValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { exposeUnsetFields: false },
});

const check = (body: object) => pipe.transform(body, { type: 'body', metatype: CourierApplicationDto }) as Promise<CourierApplicationDto>;

/** A body the route takes, as a person types it. Every value is made up. */
const typed = {
  name: 'Zuleica Tavares',
  document: '529.982.247-25',
  email: 'zuleica.tavares@exemplo.test',
  whatsapp: '(85) 98765-4321',
  city: 'FORTALEZA_CE',
  vehicle: 'MOTORCYCLE',
  acceptedTerms: true,
};

type Refusal = { response: { errorCode?: string; message: string[] } };

const refusalOf = async (body: object) => (await check(body).catch((error: unknown) => error)) as Refusal;

describe('CourierApplicationDto', () => {
  it('hands over what the table keeps: digits, lower case, one space between words', async () => {
    const dto = await check({
      ...typed,
      name: '  Zuleica \t Tavares   Brandão ',
      email: '  Zuleica.Tavares@Exemplo.TEST ',
    });

    expect(dto).toEqual({
      name: 'Zuleica Tavares Brandão',
      document: '52998224725',
      email: 'zuleica.tavares@exemplo.test',
      whatsapp: '5585987654321',
      city: 'FORTALEZA_CE',
      vehicle: 'MOTORCYCLE',
      acceptedTerms: true,
    });
  });

  describe('the e-mail left out (BEELINK-328)', () => {
    const { email: _email, ...withoutEmail } = typed;

    it('is let through, and nothing is handed over in its place', async () => {
      const dto = await check(withoutEmail);

      expect(dto.email).toBeUndefined();
      expect(dto).toEqual({
        name: 'Zuleica Tavares',
        document: '52998224725',
        whatsapp: '5585987654321',
        city: 'FORTALEZA_CE',
        vehicle: 'MOTORCYCLE',
        acceptedTerms: true,
      });
    });

    // JSON's way of saying the same: the service reads it as one left out.
    it('is let through as a null too', async () => {
      await expect(check({ ...withoutEmail, email: null })).resolves.toMatchObject({ document: '52998224725', email: null });
    });
  });

  it.each(['52998224725', '529.982.247-25', ' 529 982 247 25 '])('reads the CPF %j as its eleven digits', async (document) => {
    expect((await check({ ...typed, document })).document).toBe('52998224725');
  });

  it.each([
    ['(85) 98765-4321', '5585987654321'],
    ['85987654321', '5585987654321'],
    ['+55 85 98765-4321', '5585987654321'],
    ['085 98765-4321', '5585987654321'],
    // Rio Grande do Sul's 55 is an area code, not the country's.
    ['(55) 99876-5432', '5555998765432'],
  ])('reads the WhatsApp %j as %s', async (whatsapp, kept) => {
    expect((await check({ ...typed, whatsapp })).whatsapp).toBe(kept);
  });

  it.each(['MOTORCYCLE', 'BICYCLE', 'CAR', 'VAN'])('takes the vehicle %s', async (vehicle) => {
    expect((await check({ ...typed, vehicle })).vehicle).toBe(vehicle);
  });

  it('lets the trap through, for the service to answer', async () => {
    expect((await check({ ...typed, website: 'http://spam.test' })).website).toBe('http://spam.test');
  });

  describe('refuses, each field with its own code', () => {
    const refusals: [string, Record<string, unknown>, CourierApplicationErrorCode][] = [
      ['a first name alone', { name: 'Zuleica' }, 'COURIER_NAME_INVALID'],
      ['a name of spaces', { name: '   ' }, 'COURIER_NAME_INVALID'],
      ['a name past the column', { name: `Zuleica ${'a'.repeat(120)}` }, 'COURIER_NAME_INVALID'],
      ['a name that is no text', { name: 42 }, 'COURIER_NAME_INVALID'],
      ['a CPF with a wrong check digit', { document: '529.982.247-26' }, 'COURIER_DOCUMENT_INVALID'],
      ['a CPF of one digit repeated', { document: '111.111.111-11' }, 'COURIER_DOCUMENT_INVALID'],
      ['a CPF too short', { document: '5299822472' }, 'COURIER_DOCUMENT_INVALID'],
      ['a CNPJ', { document: '11.222.333/0001-81' }, 'COURIER_DOCUMENT_INVALID'],
      ['a CPF sent as a number', { document: 52998224725 }, 'COURIER_DOCUMENT_INVALID'],
      ['an address with no domain', { email: 'zuleica@' }, 'COURIER_EMAIL_INVALID'],
      ['an address with no at', { email: 'zuleica.exemplo.test' }, 'COURIER_EMAIL_INVALID'],
      ['an address past the column', { email: `${'a'.repeat(250)}@exemplo.test` }, 'COURIER_EMAIL_INVALID'],
      // Left out is the key absent. A key that is there and empty is an address that is wrong.
      ['an address that is there and empty', { email: '' }, 'COURIER_EMAIL_INVALID'],
      ['an address of spaces', { email: '   ' }, 'COURIER_EMAIL_INVALID'],
      ['an address that is no text', { email: 42 }, 'COURIER_EMAIL_INVALID'],
      ['a landline', { whatsapp: '(85) 3222-1111' }, 'COURIER_WHATSAPP_INVALID'],
      ['a mobile with no area code', { whatsapp: '98765-4321' }, 'COURIER_WHATSAPP_INVALID'],
      ['an area code with a zero in it', { whatsapp: '(80) 98765-4321' }, 'COURIER_WHATSAPP_INVALID'],
      ['a number of another country', { whatsapp: '+1 415 555 2671' }, 'COURIER_WHATSAPP_INVALID'],
      ['a city that is not open', { city: 'SAO_PAULO_SP' }, 'COURIER_CITY_NOT_OPEN'],
      // The code travels, never the label the form shows.
      ['a city by its name', { city: 'Fortaleza' }, 'COURIER_CITY_NOT_OPEN'],
      ['a vehicle nobody offers', { vehicle: 'TRUCK' }, 'COURIER_VEHICLE_INVALID'],
      ['the terms left unticked', { acceptedTerms: false }, 'COURIER_TERMS_REQUIRED'],
      // No implicit conversion (apps/api/AGENTS.md, rule 6): the word is not the boolean.
      ['the terms as the word "true"', { acceptedTerms: 'true' }, 'COURIER_TERMS_REQUIRED'],
    ];

    it.each(refusals)('%s', async (_what, change, errorCode) => {
      expect((await refusalOf({ ...typed, ...change })).response.errorCode).toBe(errorCode);
    });

    it.each([
      ['name', 'COURIER_NAME_INVALID'],
      ['document', 'COURIER_DOCUMENT_INVALID'],
      ['whatsapp', 'COURIER_WHATSAPP_INVALID'],
      ['city', 'COURIER_CITY_NOT_OPEN'],
      ['vehicle', 'COURIER_VEHICLE_INVALID'],
      ['acceptedTerms', 'COURIER_TERMS_REQUIRED'],
    ] as const)('a body with no %s, with that field\'s code', async (field, errorCode) => {
      const { [field]: _left, ...rest } = typed;

      expect((await refusalOf(rest)).response.errorCode).toBe(errorCode);
    });

    it('an empty body, with the first field\'s code', async () => {
      expect((await refusalOf({})).response.errorCode).toBe('COURIER_NAME_INVALID');
    });

    it('names the first field refused, in the order the contract lists them', async () => {
      const refusal = await refusalOf({ ...typed, vehicle: 'TRUCK', email: 'zuleica@', acceptedTerms: false });

      expect(refusal.response.errorCode).toBe('COURIER_EMAIL_INVALID');
    });

    // What is answered is what a log would hold, were a refusal ever logged: the field's name, and
    // of the four fields that say who a person is, never what was typed in them.
    const personal = refusals.filter(([, change]) => ['name', 'document', 'email', 'whatsapp'].some((field) => field in change));

    it.each(personal)('%s, without repeating what was typed', async (_what, change) => {
      const [[field, value]] = Object.entries(change) as [[string, unknown]];
      const said = (await refusalOf({ ...typed, ...change })).response.message.join('; ');

      expect(said).toMatch(new RegExp(`^${field} `));
      if (String(value).trim()) expect(said).not.toContain(String(value).trim());
    });
  });

  // Nest's own answer, which the filter names BAD_REQUEST: the body chooses neither.
  it.each(['termsVersion', 'termsAcceptedAt', 'createdAt', 'id'])('refuses a body that names %s, with no code of its own', async (field) => {
    const refusal = await refusalOf({ ...typed, [field]: '1999-01-01' });

    expect(refusal.response.message).toEqual([`property ${field} should not exist`]);
    expect(refusal.response).not.toHaveProperty('errorCode');
  });

  it('refuses a trap that is no text, with no code of its own', async () => {
    expect((await refusalOf({ ...typed, website: 7 })).response).not.toHaveProperty('errorCode');
  });
});
