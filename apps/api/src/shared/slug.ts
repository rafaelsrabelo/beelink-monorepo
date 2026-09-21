/**
 * The one way a URL segment is derived from a name, anywhere in this API.
 *
 * It was written twice before this file existed: once as `normaliseSlug` in the stores DTO and once
 * as `slugify()` in the design system, so the shop's own segment and the catalogue's agreed by
 * accident. They must agree on purpose: a product slug and a category slug share a namespace with
 * the shop's route words, and `blusão` folding to `blusao` in one place and `blus-o` in another is
 * a collision that no diff shows and no test written per-module would catch.
 *
 * It **normalises rather than validates**. What comes out always satisfies SLUG_PATTERN except for
 * length, which the caller still decides — "Zé" is a legal product name and too short for a slug,
 * and the shopkeeper is told so rather than having a character invented for them.
 *
 * Accents fold to their base letter rather than being dropped, so "Camisetão" keeps its last
 * letter. The escapes are the combining diacritical marks U+0300–U+036F, spelled rather than
 * pasted: the literal characters are invisible in a diff and a reviewer cannot tell a correct range
 * from a corrupted one.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
