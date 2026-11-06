// Libs
import { describe, expect, it } from 'vitest';

// App
import { purchaseAddressOf } from './purchase-address.js';

const address = { id: 'a1', street: 'Rua Tibúrcio Cavalcante', number: '1200', city: 'Fortaleza', state: 'CE', isDefault: true };

describe('a saved address as a purchase session sees it', () => {
  it('keeps the street type, three letters of its name, the number’s first digits and the city', () => {
    expect(purchaseAddressOf(address)).toEqual({ id: 'a1', line: 'Rua Tib•••, 12•• — Fortaleza/CE', isDefault: true });
  });

  it('cuts a street with no type to three letters, and a short number to one digit', () => {
    expect(purchaseAddressOf({ ...address, street: 'Tibúrcio Cavalcante', number: '12' }).line).toBe('Tib•••, 1• — Fortaleza/CE');
    expect(purchaseAddressOf({ ...address, street: 'Av. Paulista', number: '7' }).line).toBe('Av. Pau•••, 7• — Fortaleza/CE');
  });

  it('says nothing it cannot cut: a number with no digit, a missing street or city', () => {
    expect(purchaseAddressOf({ ...address, number: 's/n' }).line).toBe('Rua Tib•••, s/n — Fortaleza/CE');
    expect(purchaseAddressOf({ ...address, street: null, number: null }).line).toBe('••• — Fortaleza/CE');
    expect(purchaseAddressOf({ ...address, city: null, state: null }).line).toBe('Rua Tib•••, 12••');
  });

  it('never carries the whole street or number', () => {
    const { line } = purchaseAddressOf(address);
    expect(line).not.toContain('Tibúrcio');
    expect(line).not.toContain('1200');
  });
});
