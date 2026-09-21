// Nest
import { Injectable, Logger } from '@nestjs/common';

// Types
import type { StoreAddress } from '@harness-monorepo/contracts';

/**
 * Nominatim's wire, declared here because it is a third party's shape and not ours — the same
 * reason test/support/mailpit.ts declares its own. `lat` and `lon` arrive as strings.
 */
interface NominatimPlace {
  lat: string;
  lon: string;
}

/**
 * The legacy called this from the browser and posted whatever came back, which is why the plan's
 * risk table ("Geocoding só no admin") and the contract both put it here instead: the panel saves an
 * address, the server resolves it once, and phase 4 measures the delivery radius from the result.
 *
 * Not configuration: there is no key to rotate and no second provider wired up. A provider that
 * needs one is an `env.ts` entry the day it arrives.
 */
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

/** Nominatim's usage policy asks for an identifying agent; an anonymous caller is throttled hard. */
const USER_AGENT = 'bee-link/1.0 (+https://github.com/beecoders/beelink-monorepo)';

/** A shop must still save when the geocoder is slow or down; the coordinates can wait. */
const TIMEOUT_MS = 4_000;

export interface GeocodedPoint {
  latitude: number;
  longitude: number;
}

@Injectable()
export class StoreGeocoder {
  private readonly logger = new Logger(StoreGeocoder.name);

  /**
   * Null whenever the address is too thin to resolve or the provider does not answer — never a
   * thrown error: a shopkeeper saving their shop must not be stopped by a third party being down.
   */
  async locate(address: StoreAddress): Promise<GeocodedPoint | null> {
    const query = queryFor(address);
    if (!query) return null;

    try {
      const url = `${NOMINATIM_SEARCH}?format=json&limit=1&q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`Geocoder answered ${response.status} for "${query}"`);
        return null;
      }

      const places = (await response.json()) as NominatimPlace[];
      const place = places[0];
      if (!place) return null;

      const latitude = Number.parseFloat(place.lat);
      const longitude = Number.parseFloat(place.lon);

      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    } catch (error) {
      this.logger.warn({ err: error }, `Geocoding "${query}" failed`);
      return null;
    }
  }
}

/** Street, city and state are the minimum that resolves to a point rather than to a whole city. */
function queryFor(address: StoreAddress): string | null {
  if (!address.street || !address.city || !address.state) return null;

  return [address.street, address.number, address.neighborhood, address.city, address.state, address.zipCode]
    .filter((part): part is string => Boolean(part))
    .join(', ');
}
