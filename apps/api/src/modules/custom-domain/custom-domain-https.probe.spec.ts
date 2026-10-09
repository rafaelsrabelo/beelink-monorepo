// Node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer as createHttpsServer } from 'node:https';
import { createServer as createTcpServer } from 'node:net';
import type { AddressInfo, Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// App
import { CUSTOM_DOMAIN_PROBE_PATH } from './custom-domain.constants.js';
import { CustomDomainHttpsProbe, probeFailureOf } from './custom-domain-https.probe.js';

// A name no DNS resolves (`.test` is reserved): the probe reaching the server below proves it went
// to the address it was handed and never looked the name up.
const HOST = 'minhaloja.test';
const LOOPBACK = '127.0.0.1';

/** A certificate for `name` signed by itself, or null on a machine with no `openssl` to make one. */
function selfSignedFor(name: string): { key: string; cert: string } | null {
  const folder = mkdtempSync(join(tmpdir(), 'custom-domain-probe-'));
  const [key, cert] = [join(folder, 'key.pem'), join(folder, 'cert.pem')];
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', `/CN=${name}`, '-addext', `subjectAltName=DNS:${name}`, '-keyout', key, '-out', cert], { stdio: 'ignore' });
    return { key: readFileSync(key, 'utf8'), cert: readFileSync(cert, 'utf8') };
  } catch {
    return null;
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

class LocalProbe extends CustomDomainHttpsProbe {
  constructor(
    protected override readonly port: number,
    protected override readonly authorities: string | undefined = undefined,
    protected override readonly timeoutMs: number = 2_000,
  ) {
    super();
  }
}

const listening = (server: Server) => new Promise<number>((resolve) => server.listen(0, LOOPBACK, () => resolve((server.address() as AddressInfo).port)));
const closed = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));

describe('probeFailureOf', () => {
  it.each(['DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'ERR_TLS_CERT_ALTNAME_INVALID'])(
    'reads %s as a certificate that is not the domain\'s',
    (code) => {
      expect(probeFailureOf(Object.assign(new Error('tls'), { code }))).toBe('CERTIFICATE_INVALID');
    },
  );

  it.each(['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'EPROTO', 'ERR_SSL_WRONG_VERSION_NUMBER', 'ABORT_ERR'])('reads %s as nothing answering', (code) => {
    expect(probeFailureOf(Object.assign(new Error('socket'), { code }))).toBe('UNREACHABLE');
  });

  it('reads what carries no code as nothing answering', () => {
    for (const error of [new Error('unknown'), null, undefined, 'ECONNREFUSED', { code: 42 }]) expect(probeFailureOf(error)).toBe('UNREACHABLE');
  });
});

const certificate = selfSignedFor(HOST);

// Sockets on the loopback alone: nothing here resolves a name or leaves the machine.
describe.skipIf(certificate === null)('CustomDomainHttpsProbe, against a server on the loopback', () => {
  const asked: { url: string | undefined; host: string | undefined; servername: unknown }[] = [];
  let status = 200;
  const server = createHttpsServer({ key: certificate?.key, cert: certificate?.cert }, (request, response) => {
    asked.push({ url: request.url, host: request.headers.host, servername: 'servername' in request.socket ? request.socket.servername : undefined });
    response.writeHead(status, status === 308 ? { location: 'https://outro-lugar.test/' } : {}).end('ok');
  });
  let port: number;

  beforeAll(async () => {
    port = await listening(server);
  });
  afterAll(() => closed(server));
  beforeEach(() => {
    asked.length = 0;
    status = 200;
  });

  it("answers when the server holds the domain's certificate, asked at the address handed over and by the domain's name", async () => {
    expect(await new LocalProbe(port, certificate?.cert).answerOf(HOST, LOOPBACK)).toBe('ANSWERED');
    expect(asked).toEqual([{ url: CUSTOM_DOMAIN_PROBE_PATH, host: HOST, servername: HOST }]);
  });

  it.each([404, 500, 503])('takes a %i for an answer: the status is not what is asked', async (answered) => {
    status = answered;

    expect(await new LocalProbe(port, certificate?.cert).answerOf(HOST, LOOPBACK)).toBe('ANSWERED');
  });

  it('takes a redirect for an answer and does not follow it', async () => {
    status = 308;

    expect(await new LocalProbe(port, certificate?.cert).answerOf(HOST, LOOPBACK)).toBe('ANSWERED');
    expect(asked).toHaveLength(1);
  });

  it('says the certificate is invalid when no authority signed it — a server answering with its default one', async () => {
    expect(await new LocalProbe(port).answerOf(HOST, LOOPBACK)).toBe('CERTIFICATE_INVALID');
    // Refused in the handshake: no request reached the server.
    expect(asked).toEqual([]);
  });

  it("says the certificate is invalid when it is good and another name's", async () => {
    expect(await new LocalProbe(port, certificate?.cert).answerOf('outraloja.test', LOOPBACK)).toBe('CERTIFICATE_INVALID');
    expect(asked).toEqual([]);
  });
});

describe('CustomDomainHttpsProbe, with nothing to answer it', () => {
  it('says unreachable when the port is closed', async () => {
    const taken = createTcpServer();
    const port = await listening(taken);
    await closed(taken);

    expect(await new LocalProbe(port).answerOf(HOST, LOOPBACK)).toBe('UNREACHABLE');
  });

  it('says unreachable when what listens does not speak TLS', async () => {
    // `resume`: a socket nobody reads never learns the other side hung up, and the server would not close.
    const plain = createTcpServer((socket) => socket.resume().end('HTTP/1.1 400 Bad Request\r\n\r\n'));
    const port = await listening(plain);

    expect(await new LocalProbe(port).answerOf(HOST, LOOPBACK)).toBe('UNREACHABLE');
    await closed(plain);
  });

  it('gives up, as unreachable, on a server that accepts the connection and says nothing', async () => {
    const silent = createTcpServer((socket) => socket.on('error', () => undefined).resume());
    const port = await listening(silent);
    const started = Date.now();

    expect(await new LocalProbe(port, undefined, 150).answerOf(HOST, LOOPBACK)).toBe('UNREACHABLE');
    expect(Date.now() - started).toBeLessThan(1_500);
    // The probe let go of its socket when it gave up: the server has no connection left to wait for.
    await closed(silent);
  });
});
