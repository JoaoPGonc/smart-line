export function formatDisplayDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Returns a human-readable short name from a geocoded address string.
 * Geocoded addresses often start with a house number (e.g. "77, Rua X, Bairro, Cidade").
 * This function skips leading numeric segments so we always get the street/place name.
 */
export function formatAddress(address: string | null | undefined, fallback = "Local"): string {
  if (!address) return fallback;
  const parts = address.split(",").map(p => p.trim()).filter(Boolean);
  // Skip segments that are purely numeric (house numbers)
  const meaningful = parts.find(p => !/^\d+$/.test(p));
  return meaningful || parts[0] || fallback;
}
