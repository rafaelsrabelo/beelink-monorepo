/**
 * The two things a check of a shop's domain asks of the network (BEELINK-281). Ports: the module
 * binds them to DNS and to HTTPS, and a test stands a fake in each one's place — no test resolves a
 * real name or calls out.
 */

/** What asking `https://<host>` came to. */
export type CustomDomainProbeOutcome = 'ANSWERED' | 'UNREACHABLE' | 'CERTIFICATE_INVALID';

export abstract class CustomDomainResolver {
  /**
   * The name's `A` records, following its CNAMEs; empty when it has none. Rejects when DNS itself
   * did not answer, which says nothing of the records.
   */
  abstract addressesOf(name: string): Promise<string[]>;
}

export abstract class CustomDomainProbe {
  /**
   * Asks `https://<host>` at `address` and nowhere else: the caller has just read `address` among
   * the host's records, and an implementation that resolved the name again could be sent somewhere
   * the check never saw. The certificate is checked against `host`. Never rejects.
   */
  abstract answerOf(host: string, address: string): Promise<CustomDomainProbeOutcome>;
}
