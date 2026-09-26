// Block
import { buttonMissing } from "./button-fields"
import { reachesBack } from "./contact-fields-field"
import type { ContactFieldValue } from "./contact-fields-field"
import type { SlideValue } from "./banner-slides-field"
import type { BenefitValue } from "./benefit-rows-field"
import type { ComponentKind, ProductSource } from "./design-types"
import { unanswered, type FaqValue } from "./faq-items-field"
import { showcaseReady } from "./showcase-fields"
import type { ShowcasePick } from "./showcase-picks-field"
import type { Target } from "./target-fields"

/*
  The Conteúdo tab's values and the rule for saving them, apart from the fields that draw them so a
  kind's values do not grow the dispatcher. Reached through `component-content-fields`, which
  re-exports both: the package's export map only resolves blocks as `.tsx`.
*/

/**
 * What a component's content holds while it is being filled in: one shape for every kind, of which
 * the fields draw only what the kind has. `""` where the wire carries null.
 *
 * What a block says, and nothing of how it sits: the format, the columns and the alignment are the
 * Layout tab's, held in the draft until Publicar; the strip's colour is its band's, in Estilo.
 */
export interface ComponentFormValues {
  kind: ComponentKind
  title: string
  subtitle: string
  body: string
  /**
   * Where the strip or a block's one button leads — the same destination a slide holds, held once for
   * the whole block.
   */
  target: Target
  categoryId: string
  productId: string
  externalUrl: string
  /** What a block's one button says. */
  buttonLabel: string
  slides: SlideValue[]
  benefits: BenefitValue[]
  /** A contact form's questions. */
  fields: ContactFieldValue[]
  /** A showcase's source, and what that source reads: its category, or its products in order. */
  source: ProductSource
  sourceCategoryId: string
  picks: ShowcasePick[]
  /** A showcase's limit as typed; `""` is the default, 24. */
  limit: string
  /** A FAQ's questions, in order. */
  faq: FaqValue[]
}

/**
 * Whether what the fields hold is a save the API would take: a contact form someone can answer, a
 * showcase whose source has what it needs, a FAQ whose every question has its answer, a button that
 * says something and names where it leads. Asked here so Salvar says so, rather than a 400.
 */
export function contentReady(value: ComponentFormValues): boolean {
  if (value.kind === "CONTACT") return reachesBack(value.fields)
  if (value.kind === "PRODUCTS") return showcaseReady(value)
  if (value.kind === "FAQ") return !value.faq.some(unanswered)
  if (value.kind === "CALL_TO_ACTION") return buttonMissing(value) === null

  return true
}
