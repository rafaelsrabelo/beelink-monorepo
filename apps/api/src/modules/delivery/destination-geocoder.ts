// Nest
import { Injectable } from '@nestjs/common';

// App
import { AddressSearchService } from '../addresses/address-search.service.js';
import { StoreGeocoder } from '../stores/store-geocoder.service.js';
import type { GeoPoint } from './distance.js';

/** A destination as the quote reads it: the CEP as eight digits, the UF in upper case, blanks as null. */
export interface Destination {
  zipCode: string;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

/** A street does not move: a month keeps a busy checkout from paying for the same door twice. */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Enough for every door a shop's customers order to in a month, and small enough to forget. */
const CACHE_MAX = 5_000;

/**
 * Where an order would go, on the map (BEELINK-176): MapTiler — the address search the API already
 * pays for — or, without its key, Nominatim, which needs the street, the city and the UF. Null when
 * neither places it: the quote then agrees the fee later rather than guess a distance.
 *
 * Remembered by CEP and number, in this process: the checkout asks again on every change of the cart,
 * and the door has not moved. A miss is not remembered — the next try may place it.
 */
@Injectable()
export class DestinationGeocoder {
  private readonly cache = new Map<string, { point: GeoPoint; at: number }>();

  constructor(
    private readonly mapTiler: AddressSearchService,
    private readonly nominatim: StoreGeocoder,
  ) {}

  async locate(destination: Destination, now = Date.now()): Promise<GeoPoint | null> {
    const key = `${destination.zipCode}|${destination.number?.toLowerCase() ?? ''}`;
    const hit = this.cache.get(key);
    if (hit && now - hit.at < CACHE_TTL_MS) return hit.point;

    const point = await this.lookUp(destination);
    this.cache.delete(key);
    if (!point) return null;

    this.cache.set(key, { point, at: now });
    // A Map keeps its insertion order: the first key is the one written longest ago.
    if (this.cache.size > CACHE_MAX) this.cache.delete(this.cache.keys().next().value!);
    return point;
  }

  private async lookUp(destination: Destination): Promise<GeoPoint | null> {
    if (!this.mapTiler.configured()) {
      return this.nominatim.locate({ ...destination, complement: null });
    }
    const street = [destination.street, destination.number].filter(Boolean).join(' ');
    const zipCode = `${destination.zipCode.slice(0, 5)}-${destination.zipCode.slice(5)}`;
    const query = [street, destination.neighborhood, destination.city, destination.state, zipCode].filter(Boolean).join(', ');
    const [first] = await this.mapTiler.search(query);
    return first ? { latitude: first.latitude, longitude: first.longitude } : null;
  }
}
