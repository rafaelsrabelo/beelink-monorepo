// Libs
import { describe, expect, it } from 'vitest';

// App
import { combinationCountOf, combinationsOf, planVariants } from './variant-combinations.js';
import type { ExistingVariant, OptionShape } from './variant-combinations.js';

const size: OptionShape = { id: 'size', valueIds: ['P', 'M'] };
const colour: OptionShape = { id: 'colour', valueIds: ['areia', 'preto'] };

function variant(id: string, values: Record<string, string> = {}): ExistingVariant {
  return { id, valueByOption: new Map(Object.entries(values)) };
}

describe('combinationsOf', () => {
  it('is one empty combination when there are no options', () => {
    expect(combinationsOf([])).toEqual([[]]);
  });

  it('crosses every value, the first option slowest', () => {
    expect(combinationsOf([size, colour])).toEqual([
      ['P', 'areia'],
      ['P', 'preto'],
      ['M', 'areia'],
      ['M', 'preto'],
    ]);
    expect(combinationCountOf([size, colour])).toBe(4);
  });
});

describe('planVariants', () => {
  it('turns the default variant into the first combination of the first option', () => {
    const plan = planVariants([size], [variant('base')]);

    expect(plan.keep).toEqual([{ variantId: 'base', valueIds: ['P'], position: 0 }]);
    expect(plan.create).toEqual([{ valueIds: ['M'], position: 1, donorId: 'base' }]);
    expect(plan.archive).toEqual([]);
  });

  it('keeps every combination that survives a removed value, and archives the one that does not', () => {
    const plan = planVariants(
      [{ id: 'size', valueIds: ['P'] }],
      [variant('p', { size: 'P' }), variant('m', { size: 'M' })],
    );

    expect(plan.keep).toEqual([{ variantId: 'p', valueIds: ['P'], position: 0 }]);
    expect(plan.create).toEqual([]);
    expect(plan.archive).toEqual(['m']);
  });

  it('extends each variant with the first value of a new option, and creates the rest from a neighbour', () => {
    const plan = planVariants([size, colour], [variant('p', { size: 'P' }), variant('m', { size: 'M' })]);

    expect(plan.keep).toEqual([
      { variantId: 'p', valueIds: ['P', 'areia'], position: 0 },
      { variantId: 'm', valueIds: ['M', 'areia'], position: 2 },
    ]);
    expect(plan.create).toEqual([
      { valueIds: ['P', 'preto'], position: 1, donorId: 'p' },
      { valueIds: ['M', 'preto'], position: 3, donorId: 'm' },
    ]);
  });

  it('collapses combinations when an option is removed, keeping the first in the shopkeeper\'s order', () => {
    const plan = planVariants(
      [size],
      [
        variant('p-areia', { size: 'P', colour: 'areia' }),
        variant('p-preto', { size: 'P', colour: 'preto' }),
        variant('m-areia', { size: 'M', colour: 'areia' }),
      ],
    );

    expect(plan.keep.map((kept) => kept.variantId)).toEqual(['p-areia', 'm-areia']);
    expect(plan.archive).toEqual(['p-preto']);
  });

  it('collapses every variant into the default one when the last option goes', () => {
    const plan = planVariants([], [variant('p', { size: 'P' }), variant('m', { size: 'M' })]);

    expect(plan.keep).toEqual([{ variantId: 'p', valueIds: [], position: 0 }]);
    expect(plan.archive).toEqual(['m']);
  });

  it('keeps a variant through a reorder of options and values', () => {
    const plan = planVariants(
      [
        { id: 'colour', valueIds: ['preto', 'areia'] },
        { id: 'size', valueIds: ['M', 'P'] },
      ],
      [variant('p-areia', { size: 'P', colour: 'areia' }), variant('m-preto', { size: 'M', colour: 'preto' })],
    );

    expect(plan.keep).toEqual([
      { variantId: 'm-preto', valueIds: ['preto', 'M'], position: 0 },
      { variantId: 'p-areia', valueIds: ['areia', 'P'], position: 3 },
    ]);
    expect(plan.create.map((created) => created.valueIds)).toEqual([
      ['preto', 'P'],
      ['areia', 'M'],
    ]);
  });

  it('prices a new combination from the variant that shares the most with it', () => {
    const plan = planVariants(
      [size, { id: 'colour', valueIds: ['areia', 'preto', 'verde'] }],
      [
        variant('p-areia', { size: 'P', colour: 'areia' }),
        variant('m-areia', { size: 'M', colour: 'areia' }),
      ],
    );

    const donors = Object.fromEntries(plan.create.map((created) => [created.valueIds.join(' · '), created.donorId]));
    expect(donors['M · verde']).toBe('m-areia');
    expect(donors['P · preto']).toBe('p-areia');
  });
});
