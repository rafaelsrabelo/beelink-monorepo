// Libs
import { afterEach, describe, expect, it, vi } from 'vitest';

// App
import { fetchStaticMap, toSuggestion, toUf } from './address-search.service.js';

/**
 * A feature copied from what MapTiler actually answers for a Brazilian address — not from the
 * documented example, which is European and hides the two traps below: `properties.ref` is an OSM
 * identifier rather than a house number, and `region` is the macro region rather than the UF.
 */
function feature(overrides: Record<string, unknown> = {}) {
  return {
    id: 'address.1234',
    text: 'Rua Lavras',
    address: '120',
    place_name: 'Rua Lavras 120, Aldeota, Fortaleza, Ceará 60170-070, Brasil',
    geometry: { coordinates: [-38.4998, -3.7436] },
    properties: { ref: 'osm:w158084972' },
    context: [
      { id: 'postal_code.28', text: '60170-070' },
      { id: 'neighbourhood.9', text: 'Aldeota' },
      { id: 'municipality.7', text: 'Fortaleza' },
      { id: 'subregion.3', text: 'Ceará' },
      { id: 'region.15', text: 'Região Nordeste' },
      { id: 'country.1', text: 'Brasil' },
    ],
    ...overrides,
  };
}

describe('toSuggestion', () => {
  it('reads a Brazilian address into the fields the form holds', () => {
    expect(toSuggestion(feature())).toEqual({
      id: 'address.1234',
      label: 'Rua Lavras 120, Aldeota, Fortaleza, Ceará 60170-070, Brasil',
      street: 'Rua Lavras',
      number: '120',
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
    const partial = toSuggestion(
      feature({ address: undefined, context: [{ id: 'municipality.7', text: 'Sobral' }] }),
    );

    expect(partial).toMatchObject({ street: 'Rua Lavras', number: '', city: 'Sobral', neighborhood: '', state: '', zipCode: '' });
  });

  /**
   * `properties.ref` carries an OSM identifier, and reading it as a house number put
   * "Travessa Lavras do Sul, osm:w158084972" in the box on every result. The number is
   * `feature.address`, and it is only there when the query carried one.
   */
  it('takes the house number from address, never from the OSM reference', () => {
    expect(toSuggestion(feature())?.number).toBe('120');
    expect(toSuggestion(feature({ address: undefined }))?.number).toBe('');
    expect(JSON.stringify(toSuggestion(feature()))).not.toContain('osm:');
  });

  /**
   * Apart, not glued. The form has a field for the number, and a street that already reads
   * "Rua Lavras da Mangabeira, 143" leaves that field empty with the number somewhere nobody can
   * correct without editing the street around it.
   */
  it('keeps the number out of the street', () => {
    expect(toSuggestion(feature())?.street).toBe('Rua Lavras');
  });

  /**
   * In Brazil `region` is the macro region — "Região Nordeste" — and the UF is in `subregion`.
   * Reading `region` gives the same wrong answer for every address in nine states, and it only
   * ever showed as an empty field because `toUf` refuses a name it does not know.
   */
  it('reads the UF from subregion, not from the macro region beside it', () => {
    expect(toSuggestion(feature())?.state).toBe('CE');
  });

  /**
   * `municipal_district` is the bairro in São Paulo ("Bela Vista") and a zone of the city in
   * Natal ("Região Sul"). It answers last, so a real neighbourhood always wins.
   */
  it('prefers a named neighbourhood over a municipal district', () => {
    const both = toSuggestion(
      feature({
        context: [
          { id: 'neighbourhood.9', text: 'Neópolis' },
          { id: 'municipal_district.4', text: 'Região Sul' },
        ],
      }),
    );

    expect(both?.neighborhood).toBe('Neópolis');

    const districtOnly = toSuggestion(
      feature({ context: [{ id: 'municipal_district.4', text: 'Bela Vista' }] }),
    );

    expect(districtOnly?.neighborhood).toBe('Bela Vista');
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

  it('collapses the double spaces one of the sources answers with', () => {
    expect(toSuggestion(feature({ text: 'AVENIDA  PAULISTA', address: undefined }))?.street).toBe(
      'AVENIDA PAULISTA',
    );
  });

  it('reads a house number that arrived as a number rather than a string', () => {
    expect(toSuggestion(feature({ address: 120 }))?.number).toBe('120');
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


describe('fetchStaticMap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('answers the bytes the provider drew', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } })),
    );

    expect(await fetchStaticMap({ latitude: -3.7, longitude: -38.5 }, 'k')).toMatchObject({
      contentType: 'image/png',
    });
  });

  /**
   * A refusal from MapTiler is a PNG that says no, with the reason in a `statustext` header.
   * Reading only the content type makes a key that is fine for geocoding and not for rendered
   * maps look like a network hiccup — which is what it looked like for an afternoon.
   */
  it('carries the reason out of the refusal, rather than a picture that says no', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(new Uint8Array([1]), {
            status: 403,
            headers: { 'content-type': 'image/png', statustext: '403 Access to rendered maps not allowed' },
          }),
      ),
    );

    expect(await fetchStaticMap({ latitude: -3.7, longitude: -38.5 }, 'k')).toEqual({
      refused: '403 Access to rendered maps not allowed',
    });
  });

  it('is null when the provider never answered', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));

    expect(await fetchStaticMap({ latitude: -3.7, longitude: -38.5 }, 'k')).toBeNull();
  });
});
