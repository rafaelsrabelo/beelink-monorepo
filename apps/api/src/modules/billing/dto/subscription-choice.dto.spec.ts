// App
import { ApiValidationPipe } from '../../../shared/http/api-validation.pipe.js';
import { SubscriptionChoiceDto } from './subscription-choice.dto.js';

/** The pipe as `app.setup.ts` builds it: what a body meets before the controller. */
const pipe = new ApiValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { exposeUnsetFields: false },
});

const check = (body: object) => pipe.transform(body, { type: 'body', metatype: SubscriptionChoiceDto }) as Promise<SubscriptionChoiceDto>;

type Refusal = { response: { errorCode?: string; message: string[] } };

const refusalOf = async (body: object) => (await check(body).catch((error: unknown) => error)) as Refusal;

describe('SubscriptionChoiceDto', () => {
  it.each(['MONTHLY', 'SEMIANNUAL', 'ANNUAL'])('takes %s, and hands over nothing but the cycle', async (cycle) => {
    expect(await check({ cycle })).toEqual({ cycle });
  });

  it.each([
    ['no cycle', {}],
    ['a cycle that is null', { cycle: null }],
    ["Asaas's word for six months", { cycle: 'SEMIANNUALLY' }],
    ["Asaas's word for a year", { cycle: 'YEARLY' }],
    ['a cycle Asaas has and bee-link does not sell', { cycle: 'WEEKLY' }],
    ['a cycle in lower case', { cycle: 'annual' }],
    ['a cycle with a space after it', { cycle: 'ANNUAL ' }],
    ['a number of months', { cycle: 12 }],
    ['a list', { cycle: ['MONTHLY'] }],
  ])('refuses %s with the code a screen switches on', async (_what, body) => {
    expect((await refusalOf(body)).response.errorCode).toBe('BILLING_CYCLE_INVALID');
  });

  it.each([{ priceCents: 1 }, { valueCents: 1 }, { planId: '0199a0f1-0000-7000-8000-000000000001' }, { plan: 'beelink-beelia' }, { customerId: 'cus_000000000001' }, { billingType: 'CREDIT_CARD' }, { firstDueDate: '2027-01-01' }])(
    'refuses a body that also names %j: what is charged, to whom and when is never the caller\'s to say',
    async (extra) => {
      const refused = await refusalOf({ cycle: 'MONTHLY', ...extra });

      expect(refused.response.message.join(' ')).toContain(Object.keys(extra)[0]);
    },
  );
});
