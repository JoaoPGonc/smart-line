const fs = require('fs');
let code = fs.readFileSync('src/utils/routeUtils.ts', 'utf8');

// Remove REAL_STOPS_DATABASE
const startRealStops = code.indexOf('export const REAL_STOPS_DATABASE = [');
if (startRealStops !== -1) {
    const endRealStops = code.indexOf('];', startRealStops) + 2;
    code = code.slice(0, startRealStops) + code.slice(endRealStops);
}

// Replace calculateDynamicStops
const startCalc = code.indexOf('export const calculateDynamicStops = (');
if (startCalc !== -1) {
    const endCalc = code.indexOf('export const reassignStopTimes = (');
    const newCalc = `export const calculateDynamicStops = (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  departureTime: string,
  estimatedDuration: string,
  needs: DriverNeeds
): Stopover[] => {
  const totalDist = getDistance(start.lat, start.lng, end.lat, end.lng);
  const totalDurationMins = parseDurationMinutes(estimatedDuration);
  const durationHours = totalDurationMins / 60;

  const interval = needs.stopIntervalHours || 4;
  let targetStopsCount = Math.floor(durationHours / interval);

  if (durationHours > 1.5) {
    if (needs.requiresShower || needs.requiresMeal || needs.requiresSecurity || needs.requiresScale) {
      targetStopsCount = Math.max(targetStopsCount, 1);
    }
  }

  if (targetStopsCount === 0) return [];

  const intervalMins = interval * 60;
  const selectedStops: Stopover[] = [];

  for (let i = 1; i <= targetStopsCount; i++) {
    const targetTimeMins = Math.min(i * intervalMins, totalDurationMins - 1);
    const targetFraction = targetTimeMins / totalDurationMins;

    const lat = start.lat + (end.lat - start.lat) * targetFraction;
    const lng = start.lng + (end.lng - start.lng) * targetFraction;

    selectedStops.push({
      id: \`mock-stop-\${i}\`,
      title: \`Parada de Descanso \${i}\`,
      desc: "Ponto sugerido para parada e descanso na rota.",
      lat,
      lng,
      time: "",
      progress: targetFraction,
    });
  }

  return assignStopTimesWithRest(departureTime, totalDurationMins, selectedStops, needs);
};

`;
    code = code.slice(0, startCalc) + newCalc + code.slice(endCalc);
}

fs.writeFileSync('src/utils/routeUtils.ts', code);
