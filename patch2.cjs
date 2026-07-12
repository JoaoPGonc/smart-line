const fs = require('fs');
let code = fs.readFileSync('src/utils/routeUtils.ts', 'utf8');

const newCode = `
export const generateGoogleMapsUrl = (
  originCoords: { lat: number; lng: number } | null | undefined,
  destCoords: { lat: number; lng: number } | null | undefined,
  stops: { lat?: number; lng?: number }[]
): string | null => {
  if (!originCoords || !destCoords) return null;

  const originParam = \`\${originCoords.lat},\${originCoords.lng}\`;
  const destParam = \`\${destCoords.lat},\${destCoords.lng}\`;

  const waypointsParam = stops
    .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
    .map((s) => \`\${s.lat},\${s.lng}\`)
    .join("|");

  let url = \`https://www.google.com/maps/dir/?api=1&origin=\${originParam}&destination=\${destParam}&travelmode=driving\`;

  if (waypointsParam) {
    url += \`&waypoints=\${encodeURIComponent(waypointsParam)}\`;
  }

  return url;
};
`;

code = code + newCode;
fs.writeFileSync('src/utils/routeUtils.ts', code);
