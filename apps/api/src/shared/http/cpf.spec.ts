// Libs
import { describe, expect, it } from 'vitest';

// App
import { isBirthDate } from './birth-date.js';
import { cpfDigitsOf, isCpf } from './cpf.js';

describe('a CPF', () => {
  it('holds when both check digits do', () => {
    expect(isCpf('52998224725')).toBe(true);
    expect(isCpf('11144477735')).toBe(true);
  });

  it('fails on a wrong check digit, one digit repeated, or not eleven digits', () => {
    expect(isCpf('52998224724')).toBe(false);
    expect(isCpf('11111111111')).toBe(false);
    expect(isCpf('5299822472')).toBe(false);
    expect(isCpf('529982247250')).toBe(false);
  });

  it('is its digits, however a person wrote it, and anything else is left for the check to refuse', () => {
    expect(cpfDigitsOf('529.982.247-25')).toBe('52998224725');
    expect(cpfDigitsOf(' 529 982 247 25 ')).toBe('52998224725');
    expect(cpfDigitsOf('529.982.247-2x')).toBe('529.982.247-2x');
    expect(cpfDigitsOf(null)).toBeNull();
  });
});

describe('a birth date', () => {
  const today = new Date(Date.UTC(2026, 8, 30));

  it('is a day that exists, from 1900 to today', () => {
    expect(isBirthDate('1990-05-17', today)).toBe(true);
    expect(isBirthDate('1900-01-01', today)).toBe(true);
    expect(isBirthDate('2026-09-30', today)).toBe(true);
  });

  it('is not a day that does not exist, one to come, one before 1900, or another shape', () => {
    expect(isBirthDate('1990-02-31', today)).toBe(false);
    expect(isBirthDate('2026-10-01', today)).toBe(false);
    expect(isBirthDate('1899-12-31', today)).toBe(false);
    expect(isBirthDate('17/05/1990', today)).toBe(false);
  });
});
