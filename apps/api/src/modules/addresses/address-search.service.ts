// Nest
import { Injectable, Logger } from '@nestjs/common';

// Types
import type { AddressSuggestion } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';

/**
 * MapTiler's wire, declared here because it is a third party's shape and not ours — the same
 * reason store-geocoder.service.ts declares Nominatim's. It answers GeoJSON: `coordinates` are
 * [longitude, latitude], in that order, which is the one detail that silently swaps a shop from
 * Ceará to the middle of the Atlantic.
 */
interface MapTilerContext {
  id?: unknown;
  text?: unknown;
}

interface MapTilerFeature {
  id?: unknown;
  text?: unknown;
  place_name?: unknown;
  /** The house number, when the query carried one. `properties.ref` is an OSM id and never this. */
  address?: unknown;
  geometry?: { coordinates?: unknown };
  context?: unknown;
  properties?: { postcode?: unknown };
}

/**
 * The address box behind the panel's street field, and the reason it is here rather than in the
 * web app's BFF: the key is billable. A handler that only checks a session cookie is present
 * cannot tell a shopkeeper from anyone who set one, and a search proxy nobody authenticates is a
 * free geocoder spending this account's quota. The uploads route learned this the hard way.
 *
 * Nominatim cannot do this job at all, and not for want of trying: its usage policy says in as
 * many words that auto-complete "is not yet supported by Nominatim and you must not implement such
 * a service", and its ceiling of one request per second is below what one person typing produces.
 * It stays where it is — resolving a finished address once, on save.
 */
const MAPTILER_GEOCODING = 'https://api.maptiler.com/geocoding';

/**
 * A picture of where the shop is, drawn by MapTiler and passed through. It is fetched per request
 * and never written down: their terms allow a stored geocoding result but not a stored tile, and
 * "map content from a server-side cache" is the phrase they use for what this must not become.
 */
const MAPTILER_STATIC = 'https://api.maptiler.com/maps';
const MAP_STYLE = 'streets-v2';
const MAP_SIZE = { width: 640, height: 260 };
const MAP_ZOOM = 16;

/**
 * Sent on every MapTiler call so the key can be restricted to it.
 *
 * A key used from a server cannot be restricted by origin — a server sends no `Origin` and no
 * `Referer`, so MapTiler treats it as "unknown" and refuses it the moment any origin is listed.
 * The user-agent restriction is the one that fits: put `bee-link` in that field on the key and
 * nothing else can spend it, while the key itself stays where no browser can read it.
 */
const USER_AGENT = 'bee-link/1.0 (+https://github.com/beecoders/beelink-monorepo)';

/** A suggestion that arrives after the next keystroke is worse than none. */
const TIMEOUT_MS = 3_000;

/** Below this there is nothing to suggest, and every keystroke would be a billed request. */
const MIN_QUERY_LENGTH = 3;

const MAX_RESULTS = 6;

@Injectable()
export class AddressSearchService {
  private readonly logger = new Logger(AddressSearchService.name);

  /** `null` when the key is absent: the panel then asks for the address by hand, and says so. */
  private key(): string | null {
    return env.MAPTILER_API_KEY ?? null;
  }

  configured(): boolean {
    return this.key() !== null;
  }

  /** `null` when uploads of the map are not configured, or when the provider would not draw it. */
  async map(point: { latitude: number; longitude: number }): Promise<{ bytes: Buffer; contentType: string } | null> {
    const key = this.key();
    if (!key) return null;

    const drawn = await fetchStaticMap(point, key);

    if (!drawn) {
      this.logger.warn('Static map: the provider did not answer');
      return null;
    }

    if ('refused' in drawn) {
      this.logger.warn(`Static map refused: ${drawn.refused}`);
      return null;
    }

    return drawn;
  }

  /**
   * Never throws and never partially fails: an address box that breaks a form is worse than one
   * that suggests nothing, because every field under it can still be typed.
   */
  async search(query: string): Promise<AddressSuggestion[]> {
    const key = this.key();
    const trimmed = query.trim();

    if (!key || trimmed.length < MIN_QUERY_LENGTH) return [];

    // `country=br` because the product's addresses are a CEP and a UF; `language=pt` so a
    // suggestion reads the way the shopkeeper would say it.
    const url =
      `${MAPTILER_GEOCODING}/${encodeURIComponent(trimmed)}.json` +
      `?key=${encodeURIComponent(key)}&autocomplete=true&country=br&language=pt&limit=${MAX_RESULTS}`;

    try {
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        // The key is in the URL, so the URL never reaches the log.
        this.logger.warn(`Address search answered ${response.status}`);
        return [];
      }

      const body = (await response.json()) as { features?: unknown };

      return Array.isArray(body.features)
        ? body.features.map(toSuggestion).filter((suggestion): suggestion is AddressSuggestion => suggestion !== null)
        : [];
    } catch (error) {
      this.logger.warn({ err: error }, 'Address search did not answer');
      return [];
    }
  }
}

/**
 * Bytes, not a URL. The key is in the path of the address this builds, so handing the address to a
 * browser would hand it the key — and a key in a page is a key in everyone's browser.
 *
 * `null` for anything it cannot draw, which the controller turns into a 404 rather than a broken
 * image: a form that shows a torn picture beside an address is worse than one that shows none.
 */
export async function fetchStaticMap(
  point: { latitude: number; longitude: number },
  key: string,
): Promise<{ bytes: Buffer; contentType: string } | { refused: string } | null> {
  const { longitude, latitude } = point;
  const centre = `${longitude},${latitude},${MAP_ZOOM}`;
  const size = `${MAP_SIZE.width}x${MAP_SIZE.height}@2x`;
  const url =
    `${MAPTILER_STATIC}/${MAP_STYLE}/static/${centre}/${size}.png` +
    `?key=${encodeURIComponent(key)}&markers=${encodeURIComponent(`${longitude},${latitude}`)}`;

  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // MapTiler refuses with a picture — a PNG saying "no", 200-shaped to anything that only looks
    // at the content type — and puts the reason in a `statustext` header. Without reading it, a
    // key that is fine for geocoding and not for rendered maps looks exactly like a network
    // hiccup, which is an afternoon of guessing.
    if (!response.ok) {
      return { refused: response.headers.get('statustext') ?? `HTTP ${response.status}` };
    }

    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'image/png',
    };
  } catch {
    return null;
  }
}

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** A house number arrives as a string, but a number is a number and JSON does not always agree. */
function numberish(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  return typeof value === 'number' ? String(value) : '';
}

/**
 * MapTiler names each parent by a prefixed id — `municipality.123`, `region.4`, `postal_code.9`.
 * Several prefixes can mean the same thing depending on how the place is administered, which is
 * why each field asks for a list rather than a name: a Brazilian neighbourhood comes back as
 * `neighbourhood` in one city and `subdistrict` or `suburb` in the next, and reading only one of
 * them is how a field silently stays empty.
 */
function contextText(feature: MapTilerFeature, prefixes: readonly string[]): string {
  if (!Array.isArray(feature.context)) return '';

  for (const prefix of prefixes) {
    const match = (feature.context as MapTilerContext[]).find(
      (entry) => typeof entry?.id === 'string' && entry.id.startsWith(`${prefix}.`),
    );
    if (match) return textOf(match.text);
  }

  return '';
}

/** The UF, from whatever the region entry is called — "Ceará" is not what the column stores. */
const UF_BY_STATE: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapá: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceará: 'CE',
  'distrito federal': 'DF',
  'espírito santo': 'ES',
  goiás: 'GO',
  maranhão: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  pará: 'PA',
  paraíba: 'PB',
  paraná: 'PR',
  pernambuco: 'PE',
  piauí: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondônia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'são paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

/**
 * Two letters, whether the provider gave the state's name or already gave the code. Unknown names
 * come back empty rather than truncated: "Ce" from "Ceará" would pass the column's length and be
 * wrong, and an empty field the shopkeeper fills is better than a wrong one they do not notice.
 */
export function toUf(state: string): string {
  const normalised = state.trim().toLowerCase();

  if (/^[a-z]{2}$/.test(normalised)) return normalised.toUpperCase();

  return UF_BY_STATE[normalised] ?? '';
}

export function toSuggestion(raw: unknown): AddressSuggestion | null {
  const feature = raw as MapTilerFeature;
  const coordinates = feature?.geometry?.coordinates;

  // GeoJSON is [longitude, latitude]. Reading it the other way round is the classic way to put a
  // shop in the sea, and it is silent: both numbers are plausible on their own.
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const [longitude, latitude] = coordinates as unknown[];
  if (typeof longitude !== 'number' || typeof latitude !== 'number') return null;

  // `feature.address`, not `properties.ref`. The latter is an OSM identifier — reading it as a
  // house number produced "Travessa Lavras do Sul, osm:w158084972" in the box, on every result.
  //
  // It is kept apart from the street rather than glued on. The form has a field for it, and a
  // street that already reads "Rua Lavras da Mangabeira, 143" leaves that field empty and the
  // number in a place nobody can correct without editing the street around it.
  const houseNumber = numberish(feature.address);
  // Whitespace only. One of MapTiler's Brazilian sources answers "AVENIDA  PAULISTA" with a double
  // space; collapsing it is safe, where fixing the case would be rewriting a street name on a
  // guess — and some of them really are spelled that way.
  const street = textOf(feature.text).replace(/\s+/g, ' ').trim();

  return {
    id: textOf(feature.id) || `${latitude},${longitude}`,
    label: textOf(feature.place_name) || street,
    street,
    number: houseNumber,
    // `municipal_district` last on purpose. In São Paulo it is the bairro ("Bela Vista"), and in
    // Natal it is a zone of the city ("Região Sul") — a wrong bairro. Where a real neighbourhood
    // exists it is named, and it wins.
    neighborhood: contextText(feature, [
      'neighbourhood',
      'subdistrict',
      'suburb',
      'district',
      'municipal_district',
    ]),
    // `place` is a locality inside the municipality — "Conjunto Monte Belo" inside Natal — so it
    // only answers where there is no municipality to ask.
    city: contextText(feature, ['municipality', 'place', 'city']),
    // `subregion` and never `region`: in Brazil MapTiler puts the UF in the former and the macro
    // region in the latter, so reading `region` gives "Região Nordeste" for every address in nine
    // states. It cost nothing only because `toUf` refuses a name it does not know.
    state: toUf(contextText(feature, ['subregion', 'state'])),
    zipCode: textOf(feature.properties?.postcode).replace(/\D/g, '') || contextText(feature, ['postal_code']).replace(/\D/g, ''),
    latitude,
    longitude,
  };
}
