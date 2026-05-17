/**
 * Strip undefined/null values from an object (useful for building update payloads).
 */
export const cleanObject = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

/**
 * Build a MongoDB $set-compatible update object from a flat input,
 * skipping keys that are undefined.
 */
export const buildUpdatePayload = (fields, data) => {
  const payload = {};
  for (const key of fields) {
    if (data[key] !== undefined) payload[key] = data[key];
  }
  return payload;
};

/**
 * Safely parse a positive integer, returning `defaultVal` on failure.
 */
export const safeParseInt = (val, defaultVal = 1) => {
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultVal;
};

/**
 * Capitalise first letter of a string.
 */
export const capitalise = (str = '') =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
