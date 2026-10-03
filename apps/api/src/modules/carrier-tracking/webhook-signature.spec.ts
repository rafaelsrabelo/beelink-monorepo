// Node
import { createHmac } from 'node:crypto';

// App
import { isMelhorEnvioSigned } from './webhook-signature.js';

const body = Buffer.from('{"event":"order.posted","data":{"id":"abc"}}');
const signed = createHmac('sha256', 'the-secret').update(body).digest('base64');

describe("a Melhor Envio webhook's signature (BEELINK-188)", () => {
  it("takes the app's own signature over the bytes that arrived", () => {
    expect(isMelhorEnvioSigned(body, signed, 'the-secret')).toBe(true);
  });

  it('refuses another secret, another body, a mangled signature and none at all', () => {
    expect(isMelhorEnvioSigned(body, signed, 'another-secret')).toBe(false);
    expect(isMelhorEnvioSigned(Buffer.from('{"event":"order.delivered","data":{"id":"abc"}}'), signed, 'the-secret')).toBe(false);
    expect(isMelhorEnvioSigned(body, 'not-base64-of-anything', 'the-secret')).toBe(false);
    expect(isMelhorEnvioSigned(body, undefined, 'the-secret')).toBe(false);
  });
});
