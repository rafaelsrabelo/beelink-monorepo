// Types
import type { Env } from '../../shared/config/env.js';

/**
 * What this deployment says of shops' own domains (BEELINK-281). A provider and not `env` read where
 * it is used: a unit test hands its own, and none depends on a developer's `.env`.
 */
export abstract class CustomDomainSettings {
  /** The server's public addresses, which a domain's `A` records must be. Null where the deployment names none. */
  abstract readonly targetIps: readonly string[] | null;
  /** Whether a check asks `https://<host>` once the DNS is right. */
  abstract readonly probe: boolean;
  /** The platform's own host: no shop may take it, nor a subdomain of it. */
  abstract readonly platformHost: string;
  /**
   * Every other host this deployment's web answers on — an earlier address, an alias. One already
   * points at the server and has its certificate, so a check would pass it for the first shop to
   * save it: it is refused like the platform's own.
   */
  abstract readonly reservedHosts: readonly string[];
}

export function customDomainSettingsOf(source: Pick<Env, 'SHOP_DOMAIN_TARGET_IPS' | 'SHOP_DOMAIN_PROBE' | 'SHOP_DOMAIN_RESERVED_HOSTS' | 'WEB_URL'>): CustomDomainSettings {
  return {
    targetIps: source.SHOP_DOMAIN_TARGET_IPS ?? null,
    probe: source.SHOP_DOMAIN_PROBE,
    platformHost: new URL(source.WEB_URL).hostname,
    reservedHosts: source.SHOP_DOMAIN_RESERVED_HOSTS ?? [],
  };
}
