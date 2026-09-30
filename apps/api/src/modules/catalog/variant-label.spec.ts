// Libs
import { describe, expect, it } from 'vitest';

// App
import { variantLabelOf } from './variant-label.js';

describe('variantLabelOf', () => {
  it("names the values in the product's option order", () => {
    expect(
      variantLabelOf([
        { optionName: 'Peso', optionPosition: 1, valueName: '300 g' },
        { optionName: 'Sabor', optionPosition: 0, valueName: 'Uva' },
      ]),
    ).toBe('Sabor: Uva · Peso: 300 g');
  });

  it('says nothing for a product with no options', () => {
    expect(variantLabelOf([])).toBeNull();
  });
});
