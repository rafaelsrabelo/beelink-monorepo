// Types
import type {
  BenefitRow,
  ComponentDisplay,
  ComponentKind,
  ComponentSpan,
  ContactField,
  ContactFieldType,
  PaymentMethod,
  ProductSource,
  SectionWidth,
  TextAlign,
} from '@harness-monorepo/contracts';

/**
 * A promise as it is written to the JSON column.
 *
 * A type literal restating `BenefitRow`, and not the interface itself: Prisma's `InputJsonValue`
 * wants an index signature, which an interface never has and a type literal implicitly does. The
 * `satisfies` on the table below is what keeps the two shapes from drifting apart.
 */
type PromiseRow = { id: string; icon: string; title: string; detail: string };

/** One field of a contact form, as the JSON column takes it. Same reason as `PromiseRow`. */
type ContactFieldRow = { id: string; label: string; type: ContactFieldType; required: boolean; options?: string[] };

/** One picture of a banner, as the JSON column takes it. Same reason as `PromiseRow`. */
type SlideRow = {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  target: 'NONE' | 'PRODUCT' | 'CATEGORY';
  productId?: string;
  categoryId?: string;
};

/** One product a showcase picked. Same reason as `PromiseRow`. */
type PickRow = { id: string; productId: string };

/** One question of a FAQ. Same reason as `PromiseRow`. */
type FaqRow = { id: string; question: string; answer: string };

/** A call to action's button, pointing at a product. Same reason as `PromiseRow`. */
type ButtonRow = { id: string; label: string; target: 'PRODUCT'; productId: string };

/** What a seeded component may hold: promises, a form's fields, pictures, picks, questions or a button. */
export type SeededItem = PromiseRow | ContactFieldRow | SlideRow | PickRow | FaqRow | ButtonRow;

/** One band of the page a new shop or site opens with, ready for `storeSection.create`. */
export interface SeededBand {
  section: { name?: string | null; width: SectionWidth; position: number; isActive: boolean };
  components: {
    kind: ComponentKind;
    title?: string | null;
    subtitle?: string | null;
    body?: string | null;
    align?: TextAlign | null;
    display?: ComponentDisplay | null;
    source?: ProductSource | null;
    sourceCategoryId?: string | null;
    limit?: number | null;
    columns?: number | null;
    span?: ComponentSpan;
    items: SeededItem[];
    position: number;
    isActive: boolean;
  }[];
}

/**
 * What each payment method promises, in the shop's own words.
 *
 * Written in pt-BR, and that is a decision rather than an oversight — the same one the migration
 * that first derived this band took: the product's locale is pt-BR, this band had no stored copy,
 * and the alternative is a blank band on a shop's first day. A shopkeeper who wants other words
 * types them, which they could not do before the band was theirs.
 */
const PROMISE_OF: Record<PaymentMethod, PromiseRow> = {
  MONEY: { id: 'money', icon: 'banknote', title: 'Dinheiro', detail: 'Na entrega' },
  PIX: { id: 'pix', icon: 'qr-code', title: 'PIX', detail: 'Transferência na hora' },
  CREDIT_CARD: { id: 'credit', icon: 'credit-card', title: 'Cartão de crédito', detail: 'Principais bandeiras' },
  DEBIT_CARD: { id: 'debit', icon: 'wallet', title: 'Cartão de débito', detail: 'Débito na conta' },
} satisfies Record<PaymentMethod, BenefitRow>;

/**
 * The landing page a shop opens with.
 *
 * Seeded at creation and not left to the first visit to design mode, because a shop with no
 * `PRODUCTS` band draws nothing at `/<slug>` — and the reported symptom of exactly that state was
 * "tenho produtos criados, mas não aparece". Two bands, in the order the page always drew them:
 * the promises band, from the payment methods the shop opened with — the column's default, since
 * the create form does not ask — then the shelves.
 *
 * The promises band is hidden rather than skipped when there is nothing to promise: a band with
 * `[]` is a blank strip on the front page, and a hidden one is a band the shopkeeper fills in and
 * shows where it always was.
 */
export function defaultPage(paymentMethods: readonly PaymentMethod[]): SeededBand[] {
  const promises = paymentMethods.map((method) => PROMISE_OF[method]);

  return [
    {
      // Full width: the band paints a tinted strip edge to edge and contains its list inside.
      section: { width: 'FULL', position: 0, isActive: promises.length > 0 },
      components: [{ kind: 'BENEFITS', items: promises, position: 0, isActive: true }],
    },
    {
      section: { width: 'CONTAINED', position: 1, isActive: true },
      components: [{ kind: 'PRODUCTS', display: 'RAIL', source: 'ALL', items: [], position: 0, isActive: true }],
    },
  ];
}

/**
 * The fields a contact form opens with, when nobody said otherwise.
 *
 * Seeded here rather than left empty because an empty form is refused — it has no field that
 * reaches back — and "Adicionar → Formulário de contato" sends a kind and nothing else. Three
 * fields, in pt-BR like the promises: how to answer, twice, and room to say what the visit is about.
 */
export function defaultContactFields(): ContactFieldRow[] {
  return [
    { id: 'email', label: 'E-mail', type: 'EMAIL', required: true },
    { id: 'telefone', label: 'Telefone', type: 'PHONE', required: true },
    { id: 'mensagem', label: 'Mensagem', type: 'TEXTAREA', required: false },
  ] satisfies ContactField[];
}

/** What a component created without items holds. Every kind but the form holds nothing. */
export function openingItemsOf(kind: ComponentKind): SeededItem[] {
  return kind === 'CONTACT' ? defaultContactFields() : [];
}

/**
 * How a new component lays out what it holds. A banner opens as a carousel, which is what its second
 * slide has always turned it into; a showcase opens as a rail, which is what the landing page's
 * shelf has always been; the categories open as a rail too, which is what the shopkeeper asked of
 * them. The benefits and the strip open with none on purpose: unset, each keeps the look it always
 * had, which no layout of theirs repeats exactly. A kind born with layouts opens with its first, so
 * it has no "none chosen". No other kind reads the column.
 */
export function openingDisplayOf(kind: ComponentKind): ComponentDisplay | null {
  if (kind === 'BANNER') return 'CAROUSEL';
  if (kind === 'PRODUCTS' || kind === 'CATEGORIES') return 'RAIL';
  if (kind === 'FAQ') return 'ACCORDION';
  if (kind === 'CALL_TO_ACTION') return 'BAND';
  if (kind === 'IMAGE_TEXT') return 'IMAGE_LEFT';
  return null;
}

/** The promises a shop's payment methods make, in the order the methods are listed: a benefits band's rows. */
export function promisesOf(paymentMethods: readonly PaymentMethod[]): SeededItem[] {
  return paymentMethods.map((method) => PROMISE_OF[method]);
}
