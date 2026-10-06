// Libs
import { describe, expect, it } from 'vitest';

// App
import { refundableWord, refundRefusalOf } from './refund-refusal.js';

describe("Asaas's no to a refund (BEELINK-208)", () => {
  it('knows the want of balance by its word, whatever the case', () => {
    expect(refundRefusalOf('Saldo insuficiente para realizar o estorno.')).toBe('REFUND_NO_BALANCE');
    expect(refundRefusalOf('Não há SALDO disponível')).toBe('REFUND_NO_BALANCE');
    expect(refundRefusalOf('Insufficient balance')).toBe('REFUND_NO_BALANCE');
  });

  it("leaves every other refusal to Asaas's own words", () => {
    expect(refundRefusalOf('O prazo para estorno desta cobrança expirou.')).toBe('REFUND_REFUSED');
    expect(refundRefusalOf('no reason given')).toBe('REFUND_REFUSED');
  });

  it('lets a paid charge be refunded, and not one under review, being refunded, disputed or received in cash', () => {
    for (const word of ['CONFIRMED', 'RECEIVED', 'DUNNING_RECEIVED', null]) expect(refundableWord(word)).toBe(true);
    for (const word of ['AWAITING_RISK_ANALYSIS', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'RECEIVED_IN_CASH', 'REFUNDED']) expect(refundableWord(word)).toBe(false);
  });
});
