// Types
import type { AsaasEnvironment } from '@harness-monorepo/contracts';

/*
  Imports nothing that runs: `shared/config/env.ts` reads the prefixes to refuse a key of the other
  Asaas at boot, and whatever this file imported would be loaded before the environment was parsed.
*/

/** Where each Asaas answers, up to `/v3`, with no slash after it. */
export const ASAAS_BASE_URLS: Record<AsaasEnvironment, string> = {
  SANDBOX: 'https://api-sandbox.asaas.com/v3',
  PRODUCTION: 'https://api.asaas.com/v3',
};

/** A key says which Asaas it is for in its first characters; one with neither is an older key, and Asaas itself decides. */
export const ASAAS_KEY_PREFIXES: Record<AsaasEnvironment, string> = {
  SANDBOX: '$aact_hmlg_',
  PRODUCTION: '$aact_prod_',
};

/** `ASAAS_ENV`, in the wire's word. */
export const asaasEnvironmentOf = (value: 'sandbox' | 'production'): AsaasEnvironment => (value === 'production' ? 'PRODUCTION' : 'SANDBOX');

/** Whether a key's first characters say it is for the other Asaas. A key that says nothing is not. */
export function keyOfOtherEnvironment(environment: AsaasEnvironment, apiKey: string): boolean {
  return apiKey.startsWith(ASAAS_KEY_PREFIXES[environment === 'PRODUCTION' ? 'SANDBOX' : 'PRODUCTION']);
}
