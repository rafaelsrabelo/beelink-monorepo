/** A point on the map, in decimal degrees. */
export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** The Earth's mean radius (IUGG), in metres. */
const EARTH_RADIUS_METERS = 6_371_008.8;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * How far apart two points are in a straight line over the Earth's surface — the haversine, in whole
 * metres. A shop's bands are drawn in this distance (BEELINK-175): the road is always longer, and the
 * shopkeeper is told so where the bands are set.
 */
export function distanceMeters(from: GeoPoint, to: GeoPoint): number {
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a))));
}
