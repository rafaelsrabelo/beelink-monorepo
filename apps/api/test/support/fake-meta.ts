// App
import { MetaConversionsClient, type MetaServerEvent } from '../../src/modules/integrations/meta-pixel/meta-conversions.client.js';

export interface MetaRequest {
  pixelId: string;
  accessToken: string;
  event: MetaServerEvent;
  testEventCode?: string;
}

/**
 * Meta's Conversions API, in memory (BEELINK-274): it keeps every request it was sent and takes
 * them all, until a test says otherwise — `failing` is what every next call throws, `failNext` what
 * the next ones do, in order. Nothing of it leaves the process: no suite reaches the real Meta.
 */
export class FakeMeta extends MetaConversionsClient {
  readonly requests: MetaRequest[] = [];
  /** Thrown by every call while set. */
  failing: Error | null = null;
  private readonly once: Error[] = [];

  reset(): void {
    this.requests.length = 0;
    this.taken.length = 0;
    this.once.length = 0;
    this.failing = null;
  }

  failNext(...errors: Error[]): void {
    this.once.push(...errors);
  }

  /** The requests Meta took: every one that did not fail. */
  readonly taken: MetaRequest[] = [];

  async send(pixelId: string, accessToken: string, event: MetaServerEvent, testEventCode?: string): Promise<void> {
    const request = { pixelId, accessToken, event, ...(testEventCode ? { testEventCode } : {}) };
    this.requests.push(request);
    const failure = this.once.shift() ?? this.failing;
    if (failure) throw failure;
    this.taken.push(request);
  }
}
