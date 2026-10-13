// Libs
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Made up, in the shape of a real one: the prefix, then letters and digits. */
const SANDBOX_KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA';
const PRODUCTION_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA';

/**
 * The environment read again, as a boot reads it, with these variables set. Every value here is
 * non-empty on purpose: a blank one would lose to a developer's own `.env`, and the test would then
 * read that machine instead of the schema.
 */
async function boot(variables: Record<string, string>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(variables)) vi.stubEnv(name, value);
  return (await import('./env.js')).env;
}

const refusalOf = (variables: Record<string, string>) => boot(variables).then(
  () => null,
  (error: unknown) => String(error),
);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("bee-link's own Asaas key, as the boot reads it (BEELINK-291)", () => {
  it("takes a key of this deployment's Asaas, less the spaces around it", async () => {
    expect((await boot({ ASAAS_ENV: 'sandbox', ASAAS_PLATFORM_API_KEY: ` ${SANDBOX_KEY}\n` })).ASAAS_PLATFORM_API_KEY).toBe(SANDBOX_KEY);
    expect((await boot({ ASAAS_ENV: 'production', ASAAS_PLATFORM_API_KEY: PRODUCTION_KEY })).ASAAS_PLATFORM_API_KEY).toBe(PRODUCTION_KEY);
  });

  /** An older key names no environment: Asaas itself decides, as for a shop's. */
  it('takes a key whose first characters say nothing of which Asaas it is for', async () => {
    expect((await boot({ ASAAS_ENV: 'production', ASAAS_PLATFORM_API_KEY: '$aact_YTU5YTE0M2M2N2I4MTliNzk0' })).ASAAS_PLATFORM_API_KEY).toBe('$aact_YTU5YTE0M2M2N2I4MTliNzk0');
  });

  it.each([
    ['a production key in the sandbox', { ASAAS_ENV: 'sandbox', ASAAS_PLATFORM_API_KEY: PRODUCTION_KEY }],
    ['a sandbox key in production', { ASAAS_ENV: 'production', ASAAS_PLATFORM_API_KEY: SANDBOX_KEY }],
  ])('stops the boot for %s, naming the variable and never the key', async (_what, variables) => {
    const refusal = await refusalOf(variables);

    expect(refusal).toContain('Invalid environment');
    expect(refusal).toContain('ASAAS_PLATFORM_API_KEY is a key of the other Asaas');
    expect(refusal).not.toContain(variables.ASAAS_PLATFORM_API_KEY);
    // Not the part after the prefix either, which is the secret of it.
    expect(refusal).not.toContain('000MzkwODA2');
  });

  it('takes a webhook token of 32 to 255 characters with no space, and stops the boot for any other — without repeating it', async () => {
    const token = 'a'.repeat(43);
    expect((await boot({ ASAAS_PLATFORM_WEBHOOK_TOKEN: token })).ASAAS_PLATFORM_WEBHOOK_TOKEN).toBe(token);

    for (const bad of ['short-token-of-less-than-32', `${'b'.repeat(20)} ${'b'.repeat(20)}`, 'c'.repeat(256)]) {
      const refusal = await refusalOf({ ASAAS_PLATFORM_WEBHOOK_TOKEN: bad });

      expect(refusal).toContain('ASAAS_PLATFORM_WEBHOOK_TOKEN must be 32 to 255 characters with no space');
      expect(refusal).not.toContain(bad);
    }
  });
});
