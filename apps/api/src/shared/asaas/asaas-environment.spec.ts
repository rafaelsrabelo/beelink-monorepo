// Libs
import { describe, expect, it } from 'vitest';

// App
import { ASAAS_BASE_URLS, asaasEnvironmentOf, keyOfOtherEnvironment } from './asaas-environment.js';

describe('which Asaas a deployment talks to, and which a key is for', () => {
  it("names the environment in the wire's word, and answers at its own address", () => {
    expect(asaasEnvironmentOf('sandbox')).toBe('SANDBOX');
    expect(asaasEnvironmentOf('production')).toBe('PRODUCTION');
    expect(ASAAS_BASE_URLS).toEqual({ SANDBOX: 'https://api-sandbox.asaas.com/v3', PRODUCTION: 'https://api.asaas.com/v3' });
  });

  it("tells a key of the other Asaas by its first characters, and takes one that says nothing as this one's", () => {
    expect(keyOfOtherEnvironment('SANDBOX', '$aact_prod_abc')).toBe(true);
    expect(keyOfOtherEnvironment('PRODUCTION', '$aact_hmlg_abc')).toBe(true);
    expect(keyOfOtherEnvironment('SANDBOX', '$aact_hmlg_abc')).toBe(false);
    expect(keyOfOtherEnvironment('PRODUCTION', '$aact_prod_abc')).toBe(false);
    // An older key, from before the prefix named the environment.
    expect(keyOfOtherEnvironment('SANDBOX', '$aact_YTU5YTE0')).toBe(false);
    expect(keyOfOtherEnvironment('PRODUCTION', '$aact_YTU5YTE0')).toBe(false);
    // The prefix is read where it begins, not wherever it shows up.
    expect(keyOfOtherEnvironment('SANDBOX', 'x$aact_prod_abc')).toBe(false);
  });
});
