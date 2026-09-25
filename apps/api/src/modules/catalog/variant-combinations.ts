/**
 * Which variants a product keeps, gains and archives when its options change — pure, so the rules
 * can be read and tested without a database.
 *
 * The rule the shopkeeper sees is "editing the options never loses the price and stock of a
 * combination that still exists". Each existing variant is projected onto the new options:
 * - an option it already had keeps its value, if that value still exists;
 * - an option that is new takes the option's first value, so adding "Cor" to a product sold in P
 *   and M turns P into "P · first colour" with its price and stock intact;
 * - an option that was removed is dropped, so combinations that differed only there collapse, and
 *   the first of them in the shopkeeper's order that is on sale carries on — the first of all when
 *   none is, so a collapse never leaves a product with only the combination it had switched off.
 *
 * A variant whose value was removed has no combination left and is archived, as is every variant
 * that lost a collapse. Combinations nobody claimed are created, copying a neighbour's price.
 */

/** The options as they will be, in order, each with its values in order. */
export interface OptionShape {
  id: string;
  valueIds: readonly string[];
}

/** A variant as it is now, not archived, in position order. */
export interface ExistingVariant {
  id: string;
  isActive: boolean;
  /** Option id → value id. Empty for a default variant. */
  valueByOption: ReadonlyMap<string, string>;
}

export interface VariantPlan {
  /** Existing variants that carry on, each with its new combination and position. */
  keep: { variantId: string; valueIds: string[]; position: number }[];
  /** Combinations to create, each copying the per-unit values of `donorId`. */
  create: { valueIds: string[]; position: number; donorId: string }[];
  /** Existing variants that no longer name a combination. */
  archive: string[];
}

/** Every combination of the options' values, first option slowest. No options is one empty combination. */
export function combinationsOf(options: readonly OptionShape[]): string[][] {
  return options.reduce<string[][]>(
    (combinations, option) => combinations.flatMap((prefix) => option.valueIds.map((valueId) => [...prefix, valueId])),
    [[]],
  );
}

/** How many variants the options make, without building them. */
export function combinationCountOf(options: readonly OptionShape[]): number {
  return options.reduce((count, option) => count * option.valueIds.length, 1);
}

/** Where an existing variant lands on the new options, or null when one of its values is gone. */
function projectionOf(variant: ExistingVariant, options: readonly OptionShape[]): string[] | null {
  const valueIds: string[] = [];

  for (const option of options) {
    const had = variant.valueByOption.get(option.id);
    const valueId = had ?? option.valueIds[0];
    if (valueId === undefined || !option.valueIds.includes(valueId)) return null;
    valueIds.push(valueId);
  }

  return valueIds;
}

/** The existing variant that shares the most values with a combination; the earliest wins a tie. */
function donorFor(valueIds: readonly string[], variants: readonly ExistingVariant[]): string {
  let best = variants[0];
  let bestShared = -1;

  for (const variant of variants) {
    const values = new Set(variant.valueByOption.values());
    const shared = valueIds.filter((valueId) => values.has(valueId)).length;
    if (shared > bestShared) {
      best = variant;
      bestShared = shared;
    }
  }

  if (!best) throw new Error('A product always has at least one variant');
  return best.id;
}

export function planVariants(options: readonly OptionShape[], existing: readonly ExistingVariant[]): VariantPlan {
  const claims = new Map<string, ExistingVariant>();
  const archive: string[] = [];

  for (const variant of existing) {
    const projection = projectionOf(variant, options);
    const key = projection?.join('|');
    const claimant = key === undefined ? undefined : claims.get(key);

    if (key === undefined) archive.push(variant.id);
    else if (!claimant) claims.set(key, variant);
    else if (!claimant.isActive && variant.isActive) {
      archive.push(claimant.id);
      claims.set(key, variant);
    } else archive.push(variant.id);
  }

  const plan: VariantPlan = { keep: [], create: [], archive };

  combinationsOf(options).forEach((valueIds, position) => {
    const variantId = claims.get(valueIds.join('|'))?.id;

    if (variantId) plan.keep.push({ variantId, valueIds, position });
    else plan.create.push({ valueIds, position, donorId: donorFor(valueIds, existing) });
  });

  return plan;
}
