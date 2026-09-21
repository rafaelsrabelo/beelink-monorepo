// Types
import type { StoreColorPreset } from '@harness-monorepo/contracts';

/**
 * The six palettes the legacy shop-settings screen offered, carried over value for value so a shop
 * that had picked one still matches it after the import.
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
    colors: { background: '#F8F9FA', primary: '#8B5CF6', text: '#1A202C', header: '#8B5CF6' },
  },
  {
    id: 'azul-profissional',
    name: 'Azul Profissional',
    colors: { background: '#F0F9FF', primary: '#3B82F6', text: '#1A202C', header: '#3B82F6' },
  },
  {
    id: 'verde-natureza',
    name: 'Verde Natureza',
    colors: { background: '#F0FDF4', primary: '#10B981', text: '#1A202C', header: '#10B981' },
  },
  {
    id: 'rosa-moderno',
    name: 'Rosa Moderno',
    colors: { background: '#FDF2F8', primary: '#EC4899', text: '#1A202C', header: '#EC4899' },
  },
  {
    id: 'laranja-energia',
    name: 'Laranja Energia',
    colors: { background: '#FFF7ED', primary: '#F97316', text: '#1A202C', header: '#F97316' },
  },
  {
    id: 'vermelho-classico',
    name: 'Vermelho Clássico',
    colors: { background: '#FEF2F2', primary: '#EF4444', text: '#1A202C', header: '#EF4444' },
  },
] as const satisfies readonly StoreColorPreset[];
