// App
import { payerOf, type PayingOrder } from './payment-payer.js';

const record = { id: 'record-1', name: 'Bia Cliente', cpf: '52998224725' };
const orderOf = (extra: Partial<PayingOrder>): PayingOrder => ({ purchaseSessionId: null, payerDocument: null, payerName: null, customer: record, ...extra });

describe('who an order is charged to (plan 2026-11-11--cobranca-do-visitante)', () => {
  it("charges a visitor in the CPF and the name they typed, never their record's", () => {
    expect(payerOf(orderOf({ purchaseSessionId: 'session-1', payerDocument: '11144477735', payerName: 'Ana Souza' }))).toEqual({ id: 'record-1', name: 'Ana Souza', cpf: '11144477735' });
  });

  it('charges a visitor on a new record, which holds no CPF, in the one typed', () => {
    expect(payerOf(orderOf({ purchaseSessionId: 'session-1', payerDocument: '11144477735', payerName: 'Ana Souza', customer: { ...record, cpf: null } }))?.cpf).toBe('11144477735');
  });

  it("does not charge a visitor's order that kept no CPF in the record's", () => {
    expect(payerOf(orderOf({ purchaseSessionId: 'session-1' }))).toBeNull();
  });

  it("charges an account's order in the CPF it kept, else — placed before it was kept — in the record's", () => {
    expect(payerOf(orderOf({ payerDocument: '11144477735' }))).toEqual({ id: 'record-1', name: 'Bia Cliente', cpf: '11144477735' });
    expect(payerOf(orderOf({}))).toEqual({ id: 'record-1', name: 'Bia Cliente', cpf: '52998224725' });
    expect(payerOf(orderOf({ customer: { ...record, cpf: null } }))).toBeNull();
  });
});
