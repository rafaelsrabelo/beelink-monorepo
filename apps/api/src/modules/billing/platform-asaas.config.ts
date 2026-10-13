// Types
import type { AsaasEnvironment } from '@harness-monorepo/contracts';

// App
import { ASAAS_BASE_URLS, asaasEnvironmentOf } from '../../shared/asaas/asaas-environment.js';
import { env } from '../../shared/config/env.js';
import { PlatformAsaasHttpClient } from './platform-asaas-http.client.js';

/** Which Asaas this deployment's billing talks to: the shops' own, by the same `ASAAS_ENV`. */
export const platformAsaasEnvironment = (): AsaasEnvironment => asaasEnvironmentOf(env.ASAAS_ENV);

/**
 * bee-link's own Asaas account as this deployment was set up for it, and the one read of
 * `ASAAS_PLATFORM_API_KEY` in the API (gate `api/platform-asaas-key-in-billing`). The key goes from
 * the environment straight into the client, which keeps it where nothing prints it, and is handed to
 * nothing else: it is not sealed in the shops' vault, and nothing logs or answers it. With no key the
 * client is built all the same, says it is not configured, and asks Asaas nothing.
 */
export function platformAsaasOfThisDeployment(): PlatformAsaasHttpClient {
  const apiKey = env.ASAAS_PLATFORM_API_KEY;
  if (!apiKey) return new PlatformAsaasHttpClient(null);

  return new PlatformAsaasHttpClient({
    baseUrl: ASAAS_BASE_URLS[platformAsaasEnvironment()],
    userAgent: `bee-link (${env.ASAAS_CONTACT_EMAIL})`,
    apiKey,
  });
}
