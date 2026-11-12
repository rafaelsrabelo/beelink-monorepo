// Libs
import { describe, expect, it } from 'vitest';

// App
import { maskedCpfOf } from './affiliate-cpf.js';

describe("an affiliate's CPF in their own area", () => {
  it('shows the middle six digits only', () => {
    expect(maskedCpfOf('52998224725')).toBe('***.982.247-**');
  });

  it('shows nothing when the shop has none, or none that is eleven digits', () => {
    expect(maskedCpfOf(null)).toBeNull();
    expect(maskedCpfOf('123')).toBeNull();
  });
});
