// Libs
import { describe, expect, it } from 'vitest';

// App
import { ratingOf } from '../catalog/product-rating.js';
import { authorNameOf } from './reviews.mapper.js';

describe('authorNameOf', () => {
  it('shows the first name and the last one’s initial, or the one name there is', () => {
    expect(authorNameOf({ name: 'Rafael de Souza', userId: 'u' })).toBe('Rafael S.');
    expect(authorNameOf({ name: '  ana   lima ', userId: 'u' })).toBe('ana L.');
    expect(authorNameOf({ name: 'Caio', userId: 'u' })).toBe('Caio');
    expect(authorNameOf({ name: 'Bia Émile', userId: 'u' })).toBe('Bia É.');
  });

  it('says "Cliente" once the record has no account, or no name', () => {
    expect(authorNameOf({ name: 'Rafael Souza', userId: null })).toBe('Cliente');
    expect(authorNameOf({ name: '   ', userId: 'u' })).toBe('Cliente');
  });
});

describe('ratingOf', () => {
  it('is the average to one decimal, and nothing without a review', () => {
    expect(ratingOf(3, 14)).toEqual({ average: 4.7, count: 3 });
    expect(ratingOf(2, 9)).toEqual({ average: 4.5, count: 2 });
    expect(ratingOf(0, 0)).toBeNull();
  });
});
