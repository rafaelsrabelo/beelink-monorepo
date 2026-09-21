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
  geometry?: { coordinates?: unknown };
  context?: unknown;
  properties?: { ref?: unknown; postcode?: unknown };
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
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

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

function textOf(value: unknown): string {
  return typeof value === 'string' ? value : '';
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

  const houseNumber = textOf(feature.properties?.ref);
  const street = textOf(feature.text);

  return {
    id: textOf(feature.id) || `${latitude},${longitude}`,
    label: textOf(feature.place_name) || street,
    street: houseNumber ? `${street}, ${houseNumber}` : street,
    neighborhood: contextText(feature, ['neighbourhood', 'subdistrict', 'suburb', 'district']),
    city: contextText(feature, ['municipality', 'place', 'city']),
    state: toUf(contextText(feature, ['region', 'state'])),
    zipCode: textOf(feature.properties?.postcode).replace(/\D/g, '') || contextText(feature, ['postal_code']).replace(/\D/g, ''),
    latitude,
    longitude,
  };
}
