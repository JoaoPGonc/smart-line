import { fetchDynamicStopsFromOSM, calculateRouteSpanMins, reassignStopTimes, parseDurationMinutes } from './src/utils/routeUtils';

(async () => {
  try {
    const start = { lat: -20.319, lng: -40.292 };
    const end = { lat: -8.273, lng: -34.926 };
    const departure = '01:23';
    const estimatedDuration = '40h 0m';
    const needs = {
      stopIntervalHours: 4,
      stopDurationMinutes: 30,
      requiresShower: false,
      requiresMeal: false,
      requiresSecurity: false,
      requiresScale: false,
    };

    console.log('Running sample...');
    const fetched = await fetchDynamicStopsFromOSM(start, end, departure, estimatedDuration, needs);
    console.log('routeDurationMins', fetched.routeDurationMins);
    console.log('stops count', fetched.stops.length);
    for (const [i, s] of fetched.stops.entries()) {
      console.log(`stop ${i + 1}:`, s.id, s.time, 'progress=', s.progress, 'dur=', s.durationMinutes);
    }
    const total = calculateRouteSpanMins(fetched.routeDurationMins, fetched.stops, needs);
    console.log('routeSpan', total, Math.floor(total / 60), total % 60);
    const re = reassignStopTimes(departure, fetched.routeDurationMins, fetched.stops, needs);
    console.log('reassign');
    for (const [i, s] of re.entries()) {
      console.log(`stop ${i + 1}:`, s.id, s.time);
    }
  } catch (error) {
    console.error('ERROR', error);
  }
})();
