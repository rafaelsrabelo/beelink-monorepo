// Libs
import { describe, expect, it } from 'vitest';

// App
import { holdsMoney, inReview, isLive, statusAfter, statusSaidBy, wasPaid } from './payment-status.js';

describe("Asaas's word on a charge, as ours", () => {
  it('reads the statuses that say where the money is', () => {
    expect(statusSaidBy('PENDING', null)).toBe('PENDING');
    expect(statusSaidBy('OVERDUE', null)).toBe('OVERDUE');
    expect(statusSaidBy('CONFIRMED', null)).toBe('CONFIRMED');
    expect(statusSaidBy('RECEIVED', null)).toBe('RECEIVED');
    expect(statusSaidBy('REFUNDED', null)).toBe('REFUNDED');
    expect(statusSaidBy('DUNNING_REQUESTED', null)).toBe('OVERDUE');
    expect(statusSaidBy('DUNNING_RECEIVED', null)).toBe('RECEIVED');
  });

  /** The shop told Asaas it was paid outside: no longer payable there, so the order must not ask for another charge. */
  it('takes a charge received in cash as received', () => {
    expect(statusSaidBy('RECEIVED_IN_CASH', 'PENDING')).toBe('RECEIVED');
  });

  it('takes a card under manual review as still pending, and knows it is not to be replaced', () => {
    expect(statusSaidBy('AWAITING_RISK_ANALYSIS', null)).toBe('PENDING');
    expect(inReview('AWAITING_RISK_ANALYSIS')).toBe(true);
    expect(inReview('PENDING')).toBe(false);
    expect(inReview(null)).toBe(false);
  });

  /** How much came back is the refund's to say (BEELINK-208); until then the shop still holds money for it. */
  it('leaves a charge where it stands on a refund under way and on a chargeback, and takes one first heard of then as paid', () => {
    for (const word of ['REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL']) {
      expect(statusSaidBy(word, 'RECEIVED')).toBe('RECEIVED');
      expect(statusSaidBy(word, 'CONFIRMED')).toBe('CONFIRMED');
      expect(statusSaidBy(word, null)).toBe('CONFIRMED');
      // A charge still waiting here missed the news that it was paid (BEELINK-206).
      expect(statusSaidBy(word, 'PENDING')).toBe('CONFIRMED');
      expect(statusSaidBy(word, 'OVERDUE')).toBe('CONFIRMED');
      expect(statusSaidBy(word, 'REFUNDED')).toBe('REFUNDED');
    }
  });

  it('does not break on a word Asaas adds later', () => {
    expect(statusSaidBy('SOMETHING_NEW', 'CONFIRMED')).toBe('CONFIRMED');
    expect(statusSaidBy('SOMETHING_NEW', null)).toBe('PENDING');
  });
});

describe('where a charge stands after Asaas told of it', () => {
  const told = (status: string, deleted = false) => ({ status, deleted });

  it('moves the money’s way and never back', () => {
    expect(statusAfter(null, told('PENDING'))).toBe('PENDING');
    expect(statusAfter('PENDING', told('OVERDUE'))).toBe('OVERDUE');
    expect(statusAfter('PENDING', told('CONFIRMED'))).toBe('CONFIRMED');
    expect(statusAfter('CONFIRMED', told('RECEIVED'))).toBe('RECEIVED');
    expect(statusAfter('RECEIVED', told('REFUNDED'))).toBe('REFUNDED');
    // A late word about an earlier state.
    expect(statusAfter('RECEIVED', told('CONFIRMED'))).toBe('RECEIVED');
    expect(statusAfter('RECEIVED', told('OVERDUE'))).toBe('RECEIVED');
    expect(statusAfter('CONFIRMED', told('PENDING'))).toBe('CONFIRMED');
    expect(statusAfter('PARTIALLY_REFUNDED', told('RECEIVED'))).toBe('PARTIALLY_REFUNDED');
  });

  it('cancels a charge removed from Asaas, unless it was paid', () => {
    expect(statusAfter('PENDING', told('PENDING', true))).toBe('CANCELLED');
    expect(statusAfter('OVERDUE', told('OVERDUE', true))).toBe('CANCELLED');
    expect(statusAfter(null, told('PENDING', true))).toBe('CANCELLED');
    expect(statusAfter('RECEIVED', told('RECEIVED', true))).toBe('RECEIVED');
  });

  it('brings back one given up on only as paid: money that arrived is never left unsaid', () => {
    expect(statusAfter('CANCELLED', told('RECEIVED'))).toBe('RECEIVED');
    expect(statusAfter('CANCELLED', told('CONFIRMED'))).toBe('CONFIRMED');
    expect(statusAfter('CANCELLED', told('PENDING'))).toBe('CANCELLED');
    expect(statusAfter('CANCELLED', told('SOMETHING_NEW'))).toBe('CANCELLED');
    expect(statusAfter('FAILED', told('OVERDUE'))).toBe('FAILED');
  });

  it('tells the living from the dead, and who holds money from who was merely paid once', () => {
    expect(['PENDING', 'OVERDUE', 'CONFIRMED', 'RECEIVED', 'PARTIALLY_REFUNDED', 'REFUNDED'].every((status) => isLive(status as never))).toBe(true);
    expect([isLive('CANCELLED'), isLive('FAILED')]).toEqual([false, false]);
    expect([holdsMoney('CONFIRMED'), holdsMoney('RECEIVED'), holdsMoney('PARTIALLY_REFUNDED')]).toEqual([true, true, true]);
    expect([holdsMoney('REFUNDED'), holdsMoney('PENDING'), holdsMoney('OVERDUE')]).toEqual([false, false, false]);
    expect([wasPaid('REFUNDED'), wasPaid('CONFIRMED'), wasPaid('OVERDUE'), wasPaid('CANCELLED')]).toEqual([true, true, false, false]);
  });
});
