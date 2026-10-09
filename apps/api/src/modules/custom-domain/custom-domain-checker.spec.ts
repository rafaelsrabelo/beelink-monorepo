// Nest
import { Logger } from '@nestjs/common';

// Types
import type { CustomDomainProbeOutcome } from './custom-domain.ports.js';

// App
import { CustomDomainChecker, checkWriteOf } from './custom-domain-checker.js';
import { CustomDomainProbe, CustomDomainResolver } from './custom-domain.ports.js';

const HOST = 'minhaloja.com.br';
const SERVER = '203.0.113.10';
const SECOND = '203.0.113.11';
const PARKING = '198.51.100.7';

/** DNS as a table: a name's records, or the error asking for them ends in. A name not in it has none. */
class FakeDns extends CustomDomainResolver {
  readonly asked: string[] = [];
  constructor(private readonly records: Record<string, string[] | Error>) {
    super();
  }

  async addressesOf(name: string): Promise<string[]> {
    this.asked.push(name);
    const found = this.records[name] ?? [];
    if (found instanceof Error) throw found;
    return found;
  }
}

class FakeProbe extends CustomDomainProbe {
  readonly asked: [host: string, address: string][] = [];
  constructor(private readonly outcome: CustomDomainProbeOutcome | Error = 'ANSWERED') {
    super();
  }

  async answerOf(host: string, address: string): Promise<CustomDomainProbeOutcome> {
    this.asked.push([host, address]);
    if (this.outcome instanceof Error) throw this.outcome;
    return this.outcome;
  }
}

const HERE = { [HOST]: [SERVER], [`www.${HOST}`]: [SERVER] };
const WWW_OK = { problem: null, addresses: [SERVER] };

function checking(records: Record<string, string[] | Error>, outcome: CustomDomainProbeOutcome | Error = 'ANSWERED') {
  const dns = new FakeDns(records);
  const probe = new FakeProbe(outcome);
  const checker = new CustomDomainChecker(dns, probe);
  const check = (target: { ips?: string[]; probe?: boolean } = {}) => checker.check(HOST, { ips: target.ips ?? [SERVER], probe: target.probe ?? true });
  return { dns, probe, check };
}

describe('CustomDomainChecker', () => {
  let warned: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warned = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('finds nothing wrong when the DNS points here and the domain answers over HTTPS', async () => {
    const { dns, probe, check } = checking(HERE);

    expect(await check()).toEqual({ problem: null, addresses: [SERVER], www: WWW_OK });
    expect(warned).not.toHaveBeenCalled();
    expect(dns.asked.sort()).toEqual([HOST, `www.${HOST}`]);
    // Asked by its name, at the address just read in its records.
    expect(probe.asked).toEqual([[HOST, SERVER]]);
  });

  describe('the DNS', () => {
    it('says the name does not resolve, and asks nothing over HTTPS', async () => {
      const { probe, check } = checking({});

      expect(await check()).toEqual({ problem: 'DNS_NOT_FOUND', addresses: [], www: { problem: 'DNS_NOT_FOUND', addresses: [] } });
      expect(probe.asked).toEqual([]);
    });

    it('says the name points elsewhere, and where — and asks nothing over HTTPS', async () => {
      const { probe, check } = checking({ [HOST]: [PARKING], [`www.${HOST}`]: [PARKING] });

      expect(await check()).toEqual({ problem: 'DNS_POINTS_ELSEWHERE', addresses: [PARKING], www: { problem: 'DNS_POINTS_ELSEWHERE', addresses: [PARKING] } });
      expect(probe.asked).toEqual([]);
    });

    /** What stops a check from being a way to call an address of somebody's choosing. */
    it.each([['127.0.0.1'], ['10.0.0.5'], ['169.254.169.254'], ['192.168.0.1']])('never asks %s over HTTPS, an address that is not the server', async (address) => {
      const { probe, check } = checking({ [HOST]: [address] });

      expect((await check()).problem).toBe('DNS_POINTS_ELSEWHERE');
      expect(probe.asked).toEqual([]);
    });

    it('takes the records for wrong when the server is only one of them: some visitors would land elsewhere', async () => {
      const { probe, check } = checking({ [HOST]: [SERVER, PARKING] });

      expect(await check()).toMatchObject({ problem: 'DNS_POINTS_ELSEWHERE', addresses: [PARKING, SERVER].sort() });
      expect(probe.asked).toEqual([]);
    });

    it('wants every address of a server that has more than one', async () => {
      expect((await checking({ [HOST]: [SERVER] }).check({ ips: [SERVER, SECOND] })).problem).toBe('DNS_POINTS_ELSEWHERE');
      // The order DNS answers in, and a record told twice, are not what is compared.
      expect((await checking({ [HOST]: [SECOND, SERVER, SECOND] }).check({ ips: [SERVER, SECOND] })).problem).toBeNull();
    });

    it('says the lookup failed when DNS itself did not answer — which is not the name missing', async () => {
      const { probe, check } = checking({ [HOST]: Object.assign(new Error('queryA ETIMEOUT'), { code: 'ETIMEOUT' }), [`www.${HOST}`]: [SERVER] });

      expect(await check()).toEqual({ problem: 'DNS_LOOKUP_FAILED', addresses: [], www: WWW_OK });
      expect(probe.asked).toEqual([]);
      // The one trace of why: the shopkeeper is told a code, and the log keeps DNS's own error.
      expect(warned).toHaveBeenCalledTimes(1);
    });
  });

  describe('www.', () => {
    it.each([
      ['with no record', {}, { problem: 'DNS_NOT_FOUND', addresses: [] }],
      ['pointing elsewhere', { [`www.${HOST}`]: [PARKING] }, { problem: 'DNS_POINTS_ELSEWHERE', addresses: [PARKING] }],
      ['whose lookup failed', { [`www.${HOST}`]: new Error('SERVFAIL') }, { problem: 'DNS_LOOKUP_FAILED', addresses: [] }],
    ])('%s is a warning: the domain is checked and found right without it', async (_case, wwwRecords, www) => {
      const { probe, check } = checking({ [HOST]: [SERVER], ...wwwRecords });

      expect(await check()).toEqual({ problem: null, addresses: [SERVER], www });
      expect(probe.asked).toEqual([[HOST, SERVER]]);
    });

    it('right does not make up for a domain that is wrong', async () => {
      expect(await checking({ [`www.${HOST}`]: [SERVER] }).check()).toEqual({ problem: 'DNS_NOT_FOUND', addresses: [], www: WWW_OK });
    });
  });

  describe('the answer over HTTPS', () => {
    it.each([
      ['UNREACHABLE', 'HTTPS_UNREACHABLE'],
      ['CERTIFICATE_INVALID', 'HTTPS_CERTIFICATE_INVALID'],
    ] as const)('%s is %s, with the DNS said right', async (outcome, problem) => {
      expect(await checking(HERE, outcome).check()).toEqual({ problem, addresses: [SERVER], www: WWW_OK });
    });

    it('reads a probe that failed as unreachable, never as an answer', async () => {
      expect((await checking(HERE, new Error('boom')).check()).problem).toBe('HTTPS_UNREACHABLE');
    });

    it('is not asked where the deployment switched the probe off: the DNS being right is enough', async () => {
      const { probe, check } = checking(HERE, 'UNREACHABLE');

      expect(await check({ probe: false })).toEqual({ problem: null, addresses: [SERVER], www: WWW_OK });
      expect(probe.asked).toEqual([]);
    });

    it('switched off does not hide a DNS that is wrong', async () => {
      expect((await checking({}).check({ probe: false })).problem).toBe('DNS_NOT_FOUND');
    });
  });
});

describe('checkWriteOf', () => {
  const now = new Date('2026-10-08T15:00:00.000Z');

  it('makes the domain active when the check found nothing wrong', () => {
    expect(checkWriteOf({ problem: null }, now)).toEqual({ customDomainCheckedAt: now, customDomainProblem: null, customDomainStatus: 'ACTIVE' });
  });

  it.each(['DNS_NOT_FOUND', 'DNS_POINTS_ELSEWHERE', 'DNS_LOOKUP_FAILED', 'HTTPS_UNREACHABLE', 'HTTPS_CERTIFICATE_INVALID'] as const)(
    'writes %s and no status: a pending domain stays pending and an active one stays active',
    (problem) => {
      const write = checkWriteOf({ problem }, now);

      expect(write).toEqual({ customDomainCheckedAt: now, customDomainProblem: problem });
      expect('customDomainStatus' in write).toBe(false);
    },
  );
});
