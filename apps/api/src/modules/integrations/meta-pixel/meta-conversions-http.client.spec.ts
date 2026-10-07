// App
import { MetaEventRefused, MetaPixelNotFound, MetaTokenRejected, MetaUnreachable, type MetaServerEvent } from './meta-conversions.client.js';
import { META_GRAPH_VERSION, MetaConversionsHttpClient, metaFailureOf } from './meta-conversions-http.client.js';

const TOKEN = 'EAABsecretTOKEN0123456789abcdef';
const EVENT: MetaServerEvent = { event_name: 'Purchase', event_time: 1791295200, event_id: 'purchase-1', action_source: 'website', event_source_url: 'https://beelink.biz/lessari', user_data: { em: ['a'.repeat(64)] } };

const answer = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const refusal = (code: number, subcode?: number, message = 'Invalid') => ({ error: { message, type: 'OAuthException', code, ...(subcode ? { error_subcode: subcode } : {}), fbtrace_id: 'trace' } });

describe("Meta's refusals, sorted by their codes alone", () => {
  it.each([
    [400, { code: 190 }, 'TOKEN'],
    [401, { code: 190, error_subcode: 463 }, 'TOKEN'],
    [400, { code: 102 }, 'TOKEN'],
    [401, null, 'TOKEN'],
    [403, { code: 10 }, 'PIXEL'],
    [403, { code: 200 }, 'PIXEL'],
    [400, { code: 299 }, 'PIXEL'],
    [400, { code: 100, error_subcode: 33 }, 'PIXEL'],
    [404, null, 'PIXEL'],
    [400, { code: 100 }, 'EVENT'],
    [400, { code: 100, error_subcode: 2804003 }, 'EVENT'],
    [400, null, 'EVENT'],
    [400, { code: 1 }, 'TRANSIENT'],
    [500, { code: 2 }, 'TRANSIENT'],
    [400, { code: 4 }, 'TRANSIENT'],
    [400, { code: 17 }, 'TRANSIENT'],
    [400, { code: 341 }, 'TRANSIENT'],
    [400, { code: 368 }, 'TRANSIENT'],
    [429, null, 'TRANSIENT'],
    [503, null, 'TRANSIENT'],
  ] as const)('%i %j is %s', (status, error, expected) => {
    expect(metaFailureOf(status, error)).toBe(expected);
  });
});

describe('MetaConversionsHttpClient', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const client = new MetaConversionsHttpClient();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('posts one event to the pixel, at the pinned version, with the token in the body and never in the address', async () => {
    fetchMock.mockResolvedValue(answer(200, { events_received: 1, messages: [], fbtrace_id: 'trace' }));

    await client.send('1234567890123456', TOKEN, EVENT);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`https://graph.facebook.com/${META_GRAPH_VERSION}/1234567890123456/events`);
    expect(String(url)).not.toContain(TOKEN);
    expect(init?.method).toBe('POST');
    expect(JSON.stringify(init?.headers)).not.toContain(TOKEN);
    expect(JSON.parse(init?.body as string)).toEqual({ data: [EVENT], access_token: TOKEN });
  });

  it('sends the test code only when it is given one', async () => {
    fetchMock.mockResolvedValue(answer(200, { events_received: 1 }));

    await client.send('1234567890123456', TOKEN, EVENT, 'TEST123');

    expect(JSON.parse(fetchMock.mock.calls[0]![1]?.body as string)).toEqual({ data: [EVENT], test_event_code: 'TEST123', access_token: TOKEN });
  });

  it('takes a success with no body to read, and refuses one that says no event was received', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
    await expect(client.send('1', TOKEN, EVENT)).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(answer(200, { events_received: 0 }));
    await expect(client.send('1', TOKEN, EVENT)).rejects.toBeInstanceOf(MetaEventRefused);
  });

  it.each([
    [400, refusal(190), MetaTokenRejected],
    [400, refusal(100, 33), MetaPixelNotFound],
    [403, refusal(200), MetaPixelNotFound],
    [400, refusal(100), MetaEventRefused],
    [400, refusal(4), MetaUnreachable],
    [500, { error: { message: 'boom', code: 2 } }, MetaUnreachable],
    [502, 'not json', MetaUnreachable],
  ] as const)('answers %i %j as its own error', async (status, body, expected) => {
    fetchMock.mockResolvedValue(answer(status, body));

    await expect(client.send('1', TOKEN, EVENT)).rejects.toBeInstanceOf(expected);
  });

  it("keeps Meta's codes and words, and cuts the token out should Meta echo it", async () => {
    fetchMock.mockResolvedValue(answer(400, refusal(190, 463, `Error validating access token ${TOKEN}: Session has expired`)));

    const error = (await client.send('1', TOKEN, EVENT).catch((caught: unknown) => caught)) as Error;

    expect(error.message).toBe('Meta refused (400, code 190, subcode 463): Error validating access token [token]: Session has expired');
    expect(error.message).not.toContain(TOKEN);
  });

  it('says a network failure by its name and code alone, never by what it could not send', async () => {
    fetchMock.mockRejectedValue(Object.assign(new TypeError(`fetch failed for body with ${TOKEN}`), { cause: { code: 'ECONNRESET' } }));

    const error = (await client.send('1', TOKEN, EVENT).catch((caught: unknown) => caught)) as Error;

    expect(error).toBeInstanceOf(MetaUnreachable);
    expect(error.message).toBe('Meta did not answer (TypeError, ECONNRESET)');
  });
});
