/**
 * The shop name turned into the URL segment the create form proposes.
 *
 * It normalises rather than validates: what comes out always satisfies `SLUG_PATTERN` in
 * `store-schemas.ts` except for length, which the schema still decides — "Zé" is a legal shop name
 * and an illegal slug, and the shopkeeper must be told so rather than have two characters invented
 * for them. Accents are folded instead of dropped, so "Cantina do Zé" keeps its final letter.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
