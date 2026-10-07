// Libs
import { describe, expect, it } from 'vitest';

/**
 * The two files describe each other's shapes — the offers' answer carries the pop-up, the pop-up's
 * overview carries the offers' headline — and a decorator reads a class the moment its file loads.
 * Importing each from the other started the API with "Cannot access … before initialization"
 * whenever the offers' file was the first asked for, which is the order the compiled API asks in.
 */
describe("the offers' and the pop-up's response shapes", () => {
  it('load with the offers asked for first, as the running API asks', async () => {
    const offers = await import('./offers.response.js');
    const popup = await import('./popup.response.js');

    expect(offers.StorefrontOffersResponse).toBeTypeOf('function');
    expect(offers.StorefrontPopupResponse).toBeTypeOf('function');
    expect(popup.StorePopupOverviewResponse).toBeTypeOf('function');
  });

  it('depend one way only: what anyone is served imports nothing of the owner\'s read', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(new URL('./offers.response.ts', import.meta.url), 'utf8');

    expect(source).not.toMatch(/from '\.\/popup\.response\.js'/);
  });
});
