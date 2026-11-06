// App
import { importTypeOf } from './product-import.file.js';
import { categoryKeyOf, freeSlug } from './product-import.writes.js';

describe('freeSlug — a taken address gains a number instead of refusing the import', () => {
  it('answers the base when nothing holds it', () => {
    expect(freeSlug('dindin-de-coco', new Set(), 120)).toBe('dindin-de-coco');
  });

  it('counts up past what is taken, a reserved word included', () => {
    expect(freeSlug('dindin', new Set(['dindin', 'dindin-2']), 120)).toBe('dindin-3');
    expect(freeSlug('carrinho', new Set(['carrinho']), 120)).toBe('carrinho-2');
  });

  it('cuts the base so the suffix still fits, without leaving a hyphen before it', () => {
    const base = `${'a'.repeat(9)}-bcdef`;

    expect(freeSlug(base, new Set([base.slice(0, 12).replace(/-+$/, '')]), 12)).toBe('aaaaaaaaa-2');
  });
});

describe('categoryKeyOf — one category however the document spells it', () => {
  it('ignores case, accents and surrounding space', () => {
    expect(categoryKeyOf(' PICOLÉS ')).toBe(categoryKeyOf('picoles'));
  });
});

describe('importTypeOf — the file by its bytes, not by what the browser said', () => {
  it('knows a PDF and the three image formats', () => {
    expect(importTypeOf(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf');
    expect(importTypeOf(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('image/png');
    expect(importTypeOf(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(importTypeOf(Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBPVP8 '))).toBe('image/webp');
  });

  it('refuses anything else, a renamed text file included', () => {
    expect(importTypeOf(Buffer.from('cardapio.pdf'))).toBeNull();
    expect(importTypeOf(Buffer.from('RIFF\u0000\u0000\u0000\u0000WAVE'))).toBeNull();
    expect(importTypeOf(Buffer.alloc(0))).toBeNull();
  });
});
