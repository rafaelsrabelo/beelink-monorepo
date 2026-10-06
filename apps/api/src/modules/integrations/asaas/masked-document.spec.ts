// Libs
import { describe, expect, it } from 'vitest';

// App
import { maskedDocumentOf } from './masked-document.js';

describe('a document, masked', () => {
  it('hides the first and the last digits of a CPF and of a CNPJ', () => {
    expect(maskedDocumentOf('12345678909')).toBe('***.456.789-**');
    expect(maskedDocumentOf('11222333000181')).toBe('**.222.333/0001-**');
  });

  /** Issued since July 2026: letters in the first twelve places, and two check digits that stay digits. */
  it('masks a CNPJ that holds letters as it masks one that does not', () => {
    expect(maskedDocumentOf('12ABC34501DE35')).toBe('**.ABC.345/01DE-**');
  });

  it('shows nothing that is neither', () => {
    expect(maskedDocumentOf(null)).toBeNull();
    expect(maskedDocumentOf('1234')).toBeNull();
    expect(maskedDocumentOf('123.456.789-09')).toBeNull();
    // Eleven places are a CPF, which is digits alone; a CNPJ's last two are its check digits.
    expect(maskedDocumentOf('1234567890A')).toBeNull();
    expect(maskedDocumentOf('12ABC34501DE3X')).toBeNull();
    expect(maskedDocumentOf('12abc34501de35')).toBeNull();
  });
});
