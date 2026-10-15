const LOOPBACK = /^(localhost|127(\.\d{1,3}){3}|\[::1\])$|\.localhost$/;

/**
 * Where Asaas is to post an account's events: the web's own route at `path`, on the web's public
 * address. Null where the web is not public https: Asaas cannot reach a development machine, and a
 * webhook registered there would only pile up failures until Asaas paused its queue. The same rule
 * for a shop's account and for bee-link's own.
 */
export function publicWebhookUrl(webUrl: string, path: string): string | null {
  const web = new URL(webUrl);
  if (web.protocol !== 'https:' || LOOPBACK.test(web.hostname)) return null;
  return new URL(path, web).toString();
}
