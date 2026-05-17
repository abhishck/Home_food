/**
 * Convert kilometres to metres (MongoDB uses metres for $nearSphere).
 */
export const kmToMetres = (km) => km * 1000;

/**
 * Build a GeoJSON Point from lat/lng.
 */
export const toGeoPoint = (latitude, longitude) => ({
  type: 'Point',
  coordinates: [parseFloat(longitude), parseFloat(latitude)],
});

/**
 * Build a MongoDB $nearSphere filter for a given location and radius.
 * @param {Number} latitude
 * @param {Number} longitude
 * @param {Number} radiusKm
 */
export const nearSphereFilter = (latitude, longitude, radiusKm) => ({
  $nearSphere: {
    $geometry: toGeoPoint(latitude, longitude),
    $maxDistance: kmToMetres(radiusKm),
  },
});

/**
 * Haversine distance in km between two [lng, lat] coordinate pairs.
 */
export const haversineDistance = ([lng1, lat1], [lng2, lat2]) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toRad = (deg) => (deg * Math.PI) / 180;
