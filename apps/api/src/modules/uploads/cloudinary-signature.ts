/**
 * Cloudinary's own signing scheme: the signed parameters, sorted by name, joined as a query string,
 * with the API secret appended, digested with SHA-1. The algorithm is theirs and not a choice made
 * here — it authenticates a request with a shared secret, and the service echoes the string it signed
 * back on a refusal, which is what this was checked against. `file`, `api_key` and `signature` are
 * never signed: that is Cloudinary's rule, and signing them produces a signature it rejects.
 */
export async function signCloudinary(params: Record<string, string>, apiSecret: string): Promise<string> {
  const payload = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');

  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(payload + apiSecret));

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
