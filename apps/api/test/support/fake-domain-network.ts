// App
import { CustomDomainProbe, CustomDomainResolver, type CustomDomainProbeOutcome } from '../../src/modules/custom-domain/custom-domain.ports.js';

/**
 * DNS, in memory (BEELINK-281): a table of names and their `A` records, or the error asking for
 * them ends in. A name not in the table has no record. Nothing of it leaves the process: no suite
 * resolves a real name.
 */
export class FakeDns extends CustomDomainResolver {
  readonly asked: string[] = [];
  private readonly records = new Map<string, string[] | Error>();

  reset(): void {
    this.asked.length = 0;
    this.records.clear();
  }

  /** A domain and its `www.` both pointing at the same addresses, as a shopkeeper sets them up. */
  point(host: string, ...addresses: string[]): void {
    this.records.set(host, addresses);
    this.records.set(`www.${host}`, addresses);
  }

  set(name: string, found: string[] | Error): void {
    this.records.set(name, found);
  }

  async addressesOf(name: string): Promise<string[]> {
    this.asked.push(name);
    const found = this.records.get(name) ?? [];
    if (found instanceof Error) throw found;
    return found;
  }
}

/** What stands where the call to `https://<host>` would be: it answers until a test says otherwise, and keeps who it was asked for. */
export class FakeDomainProbe extends CustomDomainProbe {
  readonly asked: [host: string, address: string][] = [];
  outcome: CustomDomainProbeOutcome = 'ANSWERED';

  reset(): void {
    this.asked.length = 0;
    this.outcome = 'ANSWERED';
  }

  async answerOf(host: string, address: string): Promise<CustomDomainProbeOutcome> {
    this.asked.push([host, address]);
    return this.outcome;
  }
}
