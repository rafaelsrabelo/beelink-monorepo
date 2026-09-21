// App
import { STORE_COLOR_PRESETS } from './store-color-presets.constants.js';
import { HEX_COLOR, SLUG_PATTERN } from './stores.constants.js';

/**
 * These six are platform data served over the wire, not source the panel imports — which is the
 * whole reason they live in apps/api. Nothing type-checks the strings inside them, so this is what
 * stands between a typo and a shop whose brand colour renders as nothing.
 */
describe('STORE_COLOR_PRESETS', () => {
  it('carries the six the legacy shop-settings screen offered, in its order', () => {
    expect(STORE_COLOR_PRESETS.map((preset) => preset.name)).toEqual([
      'Roxo Elegante',
      'Azul Profissional',
      'Verde Natureza',
      'Rosa Moderno',
      'Laranja Energia',
      'Vermelho Clássico',
    ]);
  });

  it('answers every colour as #RRGGBB, the one form the DTO accepts back', () => {
    const channels = STORE_COLOR_PRESETS.flatMap(({ colors }) => Object.values(colors));

    expect(channels).toHaveLength(STORE_COLOR_PRESETS.length * 4);
    for (const value of channels) expect(value).toMatch(HEX_COLOR);
  });

  it('keys each palette with a slug that survives a redeploy — the panel marks the chosen one by it', () => {
    const ids = STORE_COLOR_PRESETS.map((preset) => preset.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(SLUG_PATTERN);
  });
});
