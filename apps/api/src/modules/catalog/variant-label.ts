/** One value of a combination, with its option, as a label is read from them. */
export interface ChosenValue {
  optionName: string;
  optionPosition: number;
  valueName: string;
}

/** "Sabor: Uva · Peso: 300 g", in the product's own option order. Null for a product with no options. */
export function variantLabelOf(values: readonly ChosenValue[]): string | null {
  if (values.length === 0) return null;

  return [...values]
    .sort((a, b) => a.optionPosition - b.optionPosition)
    .map((value) => `${value.optionName}: ${value.valueName}`)
    .join(' · ');
}
