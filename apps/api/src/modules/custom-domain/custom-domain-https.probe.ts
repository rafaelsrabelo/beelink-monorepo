// Node
import { request } from 'node:https';

// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { CustomDomainProbeOutcome } from './custom-domain.ports.js';

// App
import { CUSTOM_DOMAIN_PROBE_PATH, CUSTOM_DOMAIN_PROBE_TIMEOUT_MS } from './custom-domain.constants.js';
import { CustomDomainProbe } from './custom-domain.ports.js';

const USER_AGENT = 'bee-link-domain-check/1.0';

/**
 * Node's words for a certificate it will not take: OpenSSL's verification codes, and Node's own for
 * a certificate that is good and another name's. A server with no certificate for the host answers
 * with whatever it has — Traefik with its self-signed default — and lands here.
 */
const CERTIFICATE_CODES = new Set([
  'CERT_CHAIN_TOO_LONG',
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'CERT_REJECTED',
  'CERT_REVOKED',
  'CERT_SIGNATURE_FAILURE',
  'CERT_UNTRUSTED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'HOSTNAME_MISMATCH',
  'INVALID_CA',
  'INVALID_PURPOSE',
  'PATH_LENGTH_EXCEEDED',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
]);

/** A refused connection, a timeout and a port that does not speak TLS are all "nothing answered". */
export function probeFailureOf(error: unknown): Exclude<CustomDomainProbeOutcome, 'ANSWERED'> {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  return typeof code === 'string' && CERTIFICATE_CODES.has(code) ? 'CERTIFICATE_INVALID' : 'UNREACHABLE';
}

/**
 * `https://<host>` asked at one address. The socket is opened to `address` and the name travels in
 * the TLS handshake (SNI), the `Host` header and the certificate check — so the name is never
 * resolved a second time, and what answers is the very server the check read in the DNS. A redirect
 * is an answer and is not followed: nothing here ever calls a second address.
 */
@Injectable()
export class CustomDomainHttpsProbe extends CustomDomainProbe {
  /** The three are the spec's to change, which stands a server of its own on a free port: 443, the system's authorities and the one deadline everywhere else. */
  protected readonly port: number = 443;
  protected readonly authorities: string | undefined = undefined;
  protected readonly timeoutMs: number = CUSTOM_DOMAIN_PROBE_TIMEOUT_MS;

  answerOf(host: string, address: string): Promise<CustomDomainProbeOutcome> {
    return new Promise((resolve) => {
      const asking = request({
        host: address,
        servername: host,
        port: this.port,
        method: 'GET',
        path: CUSTOM_DOMAIN_PROBE_PATH,
        headers: { host, 'user-agent': USER_AGENT, connection: 'close' },
        // No shared agent: a socket kept open to one shop's domain must not serve the next one's check.
        agent: false,
        ca: this.authorities,
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      // `on`, not `once`: destroying the request below may raise a second error, and one nobody listens to stops the process.
      asking.on('error', (error) => resolve(probeFailureOf(error)));
      asking.once('response', (response) => {
        resolve('ANSWERED');
        response.resume();
        asking.destroy();
      });
      asking.end();
    });
  }
}
