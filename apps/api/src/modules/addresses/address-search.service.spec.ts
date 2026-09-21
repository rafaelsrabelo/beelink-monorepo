// Libs
import { describe, expect, it } from 'vitest';

// App
import { toSuggestion, toUf } from './address-search.service.js';

/** A feature shaped the way MapTiler documents it, with a Brazilian address in it. */
function feature(overrides: Record<string, unknown> = {}) {
  return {
    id: 'address.1234',
    text: 'Rua Lavras',
    place_name: 'Rua Lavras, 120, Aldeota, Fortaleza, CE',
    geometry: { coordinates: [-38.4998, -3.7436] },
    properties: { ref: '120', postcode: '60170-070' },
    context: [
      { id: 'neighbourhood.9', text: 'Aldeota' },
      { id: 'municipality.7', text: 'Fortaleza' },
      { id: 'region.3', text: 'Ceará' },
      { id: 'country.1', text: 'Brasil' },
    ],
    ...overrides,
  };
}

describe('toSuggestion', () => {
  it('reads a Brazilian address into the fields the form holds', () => {
    expect(toSuggestion(feature())).toEqual({
      id: 'address.1234',
      label: 'Rua Lavras, 120, Aldeota, Fortaleza, CE',
      street: 'Rua Lavras, 120',
      neighborhood: 'Aldeota',
      city: 'Fortaleza',
      state: 'CE',
      zipCode: '60170070',
      latitude: -3.7436,
      longitude: -38.4998,
    });
  });

  /**
   * GeoJSON is [longitude, latitude]. Reading it the other way round puts a shop in Fortaleza off
   * the coast of Somalia, and says nothing while doing it: both numbers are plausible alone.
   */
  it('reads the coordinates in the order GeoJSON writes them', () => {
    const suggestion = toSuggestion(feature());

    expect(suggestion?.latitude).toBe(-3.7436);
    expect(suggestion?.longitude).toBe(-38.4998);
  });

  // A provider answers with what it knows. A suggestion naming a street but no postcode is still
  // useful, and the field merges rather than assigns — the same rule the postcode lookup follows.
  it('keeps a partial suggestion rather than dropping it', () => {
    const partial = toSuggestion(feature({ properties: {}, context: [{ id: 'municipality.7', text: 'Sobral' }] }));

    expect(partial).toMatchObject({ street: 'Rua Lavras', city: 'Sobral', neighborhood: '', state: '', zipCode: '' });
  });

  /**
   * A neighbourhood is `neighbourhood` in one city and `subdistrict` or `suburb` in the next.
   * Reading only one prefix is how a field silently stays empty for half the country.
   */
  it.each(['neighbourhood', 'subdistrict', 'suburb', 'district'])('reads a neighbourhood named %s', (prefix) => {
    const suggestion = toSuggestion(feature({ context: [{ id: `${prefix}.9`, text: 'Aldeota' }] }));

    expect(suggestion?.neighborhood).toBe('Aldeota');
  });

  it('refuses a feature with no usable point, rather than inventing one', () => {
    expect(toSuggestion(feature({ geometry: {} }))).toBeNull();
    expect(toSuggestion(feature({ geometry: { coordinates: ['-38.4', '-3.7'] } }))).toBeNull();
    expect(toSuggestion(null)).toBeNull();
  });

  it('leaves the number off the street when the provider gave none', () => {
    expect(toSuggestion(feature({ properties: {} }))?.street).toBe('Rua Lavras');
  });
});

describe('toUf', () => {
  it.each([
    ['Ceará', 'CE'],
    ['São Paulo', 'SP'],
    ['Rio Grande do Sul', 'RS'],
    ['Distrito Federal', 'DF'],
    // Already a code, whichever case it arrived in.
    ['ce', 'CE'],
    ['SP', 'SP'],
  ])('reads %s as %s', (given, expected) => {
    expect(toUf(given)).toBe(expected);
  });

  /**
   * Empty and never truncated. "Ce" from "Ceará" would fit the column and be wrong, and a blank
   * field the shopkeeper fills beats a wrong one they never look at.
   */
  it('gives nothing for a name it does not know', () => {
    expect(toUf('Provincia de Buenos Aires')).toBe('');
    expect(toUf('')).toBe('');
  });
});
