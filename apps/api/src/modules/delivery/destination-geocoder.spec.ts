// Types
import type { AddressSuggestion } from '@harness-monorepo/contracts';

// App
import type { AddressSearchService } from '../addresses/address-search.service.js';
import type { StoreGeocoder } from '../stores/store-geocoder.service.js';
import { DestinationGeocoder, type Destination } from './destination-geocoder.js';

const DAY = 24 * 60 * 60 * 1000;
const POINT = { latitude: -23.5505, longitude: -46.6333 };
const destination: Destination = { zipCode: '01310930', street: 'Rua Augusta', number: '1500', neighborhood: 'Consolação', city: 'São Paulo', state: 'SP' };

function geocoderWith({ configured = true, found = true } = {}) {
  const suggestion = { ...POINT, id: '1', label: '', street: '', number: '', neighborhood: '', city: '', state: '', zipCode: '' } satisfies AddressSuggestion;
  const mapTiler = { configured: vi.fn(() => configured), search: vi.fn(async () => (found ? [suggestion] : [])) };
  const nominatim = { locate: vi.fn(async () => (found ? POINT : null)) };
  const geocoder = new DestinationGeocoder(mapTiler as unknown as AddressSearchService, nominatim as unknown as StoreGeocoder);
  return { geocoder, mapTiler, nominatim };
}

describe('placing a destination on the map (BEELINK-176)', () => {
  it('asks MapTiler with the whole address on one line, the CEP with its mask', async () => {
    const { geocoder, mapTiler, nominatim } = geocoderWith();

    expect(await geocoder.locate(destination)).toEqual(POINT);
    expect(mapTiler.search).toHaveBeenCalledWith('Rua Augusta 1500, Consolação, São Paulo, SP, 01310-930');
    expect(nominatim.locate).not.toHaveBeenCalled();
  });

  it('asks Nominatim instead while MapTiler has no key', async () => {
    const { geocoder, mapTiler, nominatim } = geocoderWith({ configured: false });

    expect(await geocoder.locate(destination)).toEqual(POINT);
    expect(nominatim.locate).toHaveBeenCalledWith({ ...destination, complement: null });
    expect(mapTiler.search).not.toHaveBeenCalled();
  });

  it('remembers a door by CEP and number for a month, whatever else is typed', async () => {
    const { geocoder, mapTiler } = geocoderWith();
    const now = Date.now();

    await geocoder.locate(destination, now);
    await geocoder.locate({ ...destination, street: 'R. Augusta', number: '1500' }, now + 29 * DAY);
    expect(mapTiler.search).toHaveBeenCalledOnce();

    await geocoder.locate(destination, now + 31 * DAY);
    expect(mapTiler.search).toHaveBeenCalledTimes(2);

    await geocoder.locate({ ...destination, number: '1501' }, now + 31 * DAY);
    expect(mapTiler.search).toHaveBeenCalledTimes(3);
  });

  it('does not remember a door it could not place: the next try may', async () => {
    const { geocoder, mapTiler } = geocoderWith({ found: false });

    expect(await geocoder.locate(destination)).toBeNull();
    expect(await geocoder.locate(destination)).toBeNull();
    expect(mapTiler.search).toHaveBeenCalledTimes(2);
  });

  it('forgets the door written longest ago past five thousand', async () => {
    const { geocoder, mapTiler } = geocoderWith();

    for (let index = 0; index <= 5000; index += 1) await geocoder.locate({ ...destination, number: String(index) });
    expect(mapTiler.search).toHaveBeenCalledTimes(5001);

    await geocoder.locate({ ...destination, number: '5000' });
    expect(mapTiler.search).toHaveBeenCalledTimes(5001);
    await geocoder.locate({ ...destination, number: '0' });
    expect(mapTiler.search).toHaveBeenCalledTimes(5002);
  });
});
