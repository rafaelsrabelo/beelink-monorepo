// Libs
import { describe, expect, it } from 'vitest';

// App
import { maskedDocumentOf } from './masked-document.js';

describe('a document, masked', () => {
  it('hides the first and the last digits of a CPF and of a CNPJ', () => {
    expect(maskedDocumentOf('12345678909')).toBe('***.456.789-**');
    expect(maskedDocumentOf('11222333000181')).toBe('**.222.333/0001-**');
  });

  it('shows nothing that is neither', () => {
    expect(maskedDocumentOf(null)).toBeNull();
    expect(maskedDocumentOf('1234')).toBeNull();
    expect(maskedDocumentOf('123.456.789-09')).toBeNull();
  });
});
