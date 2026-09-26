/* ── the items of the section kinds a sales page added ──────────────────────── */

/**
 * One question of a FAQ and its answer. The answer is plain text whose line breaks the shop keeps.
 * The order of the list is the order on the page, which the owner changes in the panel.
 */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
