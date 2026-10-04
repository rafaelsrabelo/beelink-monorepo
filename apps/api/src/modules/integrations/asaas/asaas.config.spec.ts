// Libs
import { describe, expect, it } from 'vitest';

// App
import { publicWebhookUrlOf } from './asaas.config.js';

describe("where Asaas posts a shop's events", () => {
  it("is the web's fixed route, on a public https address", () => {
    expect(publicWebhookUrlOf('https://beelink.biz')).toBe('https://beelink.biz/api/integrations/asaas/webhook');
    expect(publicWebhookUrlOf('https://beelink.biz/')).toBe('https://beelink.biz/api/integrations/asaas/webhook');
  });

  /** Asaas could not reach these: a webhook there would only fail until its queue paused. */
  it('is nowhere on plain http or on this machine', () => {
    for (const web of ['http://localhost:3000', 'http://beelink.biz', 'https://localhost:3500', 'https://127.0.0.1', 'https://[::1]:3000', 'https://loja.localhost']) {
      expect(publicWebhookUrlOf(web)).toBeNull();
    }
  });
});
