// Types
import type { StoreColorPreset } from '@harness-monorepo/contracts';

/**
 * The six palettes the legacy shop-settings screen offered, carried over so a shop that had picked
 * one still matches it after the import — with one value changed on purpose.
 *
 * **Every background is white.** The legacy palettes each tinted the page a wash of their own
 * brand colour, and the shop owner said the public page should be white. It is the right call for
 * a second reason the storefront makes plain: `--shop-background` does double duty there. It
 * paints the page AND it is the colour of every word printed on a coloured surface — the header,
 * the footer, the price badge, the WhatsApp button. A near-white tint on a coloured button is a
 * smudge; white is the contrast that was wanted all along, and every story in the design system
 * was already written with `oklch(1 0 0)`.
 *
 * The colour stays a column and stays editable. A shopkeeper who wants a cream page still picks
 * one — this changes where the palettes start, not what a shop is allowed to be.
 *
 * **A constant and not a table.** Nothing references a preset: applying one writes its four colours
 * onto the shop, and the shop keeps the colours, not the choice. A table would buy a migration, a
 * seed, a join and a foreign key for a list that is only ever read whole and never written — where
 * `store_categories` earns its table because a shop points at a row of it. Turning this into a
 * table the day a shopkeeper may define their own palette is additive: the wire shape is already
 * `StoreColorPreset` either way.
 *
 * **And it lives in apps/api.** These are colour literals, and `web/no-hex-colors` scans apps/web
 * and packages/ui — twenty-four of them in either tree would be the exact thing that gate exists to
 * stop. Served over the wire they are what they have always been: a shop's brand data, like the
 * colours already stored on every row of `stores`.
 */
export const STORE_COLOR_PRESETS = [
  {
    id: 'roxo-elegante',
    name: 'Roxo Elegante',
    colors: { background: '#FFFFFF', primary: '#8B5CF6', header: '#8B5CF6', footer: '#8B5CF6' },
  },
  {
    id: 'azul-profissional',
    name: 'Azul Profissional',
    colors: { background: '#FFFFFF', primary: '#3B82F6', header: '#3B82F6', footer: '#3B82F6' },
  },
  {
    id: 'verde-natureza',
    name: 'Verde Natureza',
    colors: { background: '#FFFFFF', primary: '#10B981', header: '#10B981', footer: '#10B981' },
  },
  {
    id: 'rosa-moderno',
    name: 'Rosa Moderno',
    colors: { background: '#FFFFFF', primary: '#EC4899', header: '#EC4899', footer: '#EC4899' },
  },
  {
    id: 'laranja-energia',
    name: 'Laranja Energia',
    colors: { background: '#FFFFFF', primary: '#F97316', header: '#F97316', footer: '#F97316' },
  },
  {
    id: 'vermelho-classico',
    name: 'Vermelho Clássico',
    colors: { background: '#FFFFFF', primary: '#EF4444', header: '#EF4444', footer: '#EF4444' },
  },
] as const satisfies readonly StoreColorPreset[];
