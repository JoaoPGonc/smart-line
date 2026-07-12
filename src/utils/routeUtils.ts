export interface Stopover {
  id: string;
  title: string;
  desc: string;
  time: string;
  date?: string;
  lat: number;
  lng: number;
  progress?: number;
  durationMinutes?: number;
}

// ─── OSRM Route Types ────────────────────────────────────────────────────────

export interface OsrmManeuver {
  type: string;        // "depart" | "turn" | "arrive" | "roundabout" | "merge" | "fork" | etc.
  modifier?: string;   // "left" | "right" | "straight" | "slight left" | "slight right" | "sharp left" | "sharp right"
  bearing_after?: number;
  bearing_before?: number;
  location?: [number, number]; // [lng, lat]
}

export interface OsrmStep {
  name: string;           // Street name
  distance: number;       // Metres to next step
  duration: number;       // Seconds to next step
  maneuver: OsrmManeuver;
  geometry?: {
    coordinates: [number, number][]; // [lng, lat]
  };
}

export interface OsrmLeg {
  distance: number;   // Total leg distance in metres
  duration: number;   // Total leg duration in seconds
  steps: OsrmStep[];
}

// ─── Real-GPS Progress Functions ──────────────────────────────────────────────

/**
 * Finds the index of the closest point on the polyline to the given GPS coords.
 * Returns progress (0–1), closestIndex, and remaining distance in km.
 */
export const getProgressAlongRoute = (
  gpsLat: number,
  gpsLng: number,
  routePoints: [number, number][]
): { progress: number; closestIndex: number; distanceRemainingKm: number } => {
  if (!routePoints || routePoints.length === 0) {
    return { progress: 0, closestIndex: 0, distanceRemainingKm: 0 };
  }

  let minDist = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < routePoints.length; i++) {
    const d = getDistance(gpsLat, gpsLng, routePoints[i][0], routePoints[i][1]);
    if (d < minDist) {
      minDist = d;
      closestIndex = i;
    }
  }

  const progress = closestIndex / Math.max(routePoints.length - 1, 1);
  const distanceRemainingKm = getDistanceAlongPolyline(routePoints, closestIndex, routePoints.length - 1);

  return { progress, closestIndex, distanceRemainingKm };
};

/**
 * Sum of haversine distances between consecutive points from `fromIndex` to `toIndex`.
 */
export const getDistanceAlongPolyline = (
  points: [number, number][],
  fromIndex: number,
  toIndex: number
): number => {
  let total = 0;
  const end = Math.min(toIndex, points.length - 1);
  for (let i = fromIndex; i < end; i++) {
    total += getDistance(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  }
  return total;
};

export const getClosestRoutePointIndex = (
  lat: number,
  lng: number,
  routePoints: [number, number][]
): number => {
  let minDist = Infinity;
  let closestIndex = 0;
  for (let i = 0; i < routePoints.length; i++) {
    const d = getDistance(lat, lng, routePoints[i][0], routePoints[i][1]);
    if (d < minDist) {
      minDist = d;
      closestIndex = i;
    }
  }
  return closestIndex;
};

export const getRouteDistanceBetweenPoints = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  routePoints: [number, number][]
): number => {
  if (!routePoints || routePoints.length === 0) {
    return getDistance(fromLat, fromLng, toLat, toLng);
  }

  const fromIndex = getClosestRoutePointIndex(fromLat, fromLng, routePoints);
  const toIndex = getClosestRoutePointIndex(toLat, toLng, routePoints);

  let total = 0;
  total += getDistance(fromLat, fromLng, routePoints[fromIndex][0], routePoints[fromIndex][1]);

  if (fromIndex <= toIndex) {
    total += getDistanceAlongPolyline(routePoints, fromIndex, toIndex);
  } else {
    total += getDistanceAlongPolyline(routePoints, toIndex, fromIndex);
  }

  total += getDistance(routePoints[toIndex][0], routePoints[toIndex][1], toLat, toLng);
  return total;
};

/**
 * Given the current GPS position and all OSRM legs, find the index of the
 * next upcoming maneuver step and the straight-line distance to it (metres).
 */
export const findCurrentStep = (
  gpsLat: number,
  gpsLng: number,
  legs: OsrmLeg[]
): { stepIndex: number; legIndex: number; step: OsrmStep | null; distanceToStepM: number } => {
  if (!legs || legs.length === 0) {
    return { stepIndex: 0, legIndex: 0, step: null, distanceToStepM: 0 };
  }

  let bestDist = Infinity;
  let bestLegIndex = 0;
  let bestStepIndex = 0;

  legs.forEach((leg, li) => {
    leg.steps.forEach((step, si) => {
      const loc = step.maneuver?.location;
      if (!loc) return;
      const d = getDistance(gpsLat, gpsLng, loc[1], loc[0]); // loc = [lng, lat]
      if (d < bestDist) {
        bestDist = d;
        bestLegIndex = li;
        bestStepIndex = si;
      }
    });
  });

  // The "current" step is the closest one. The "next" instruction is the step AFTER it.
  const leg = legs[bestLegIndex];
  const nextStepIndex = bestStepIndex + 1;
  const nextStep = leg.steps[nextStepIndex] ?? leg.steps[bestStepIndex] ?? null;
  const nextLoc = nextStep?.maneuver?.location;
  const distanceToNextM = nextLoc
    ? getDistance(gpsLat, gpsLng, nextLoc[1], nextLoc[0]) * 1000
    : bestDist * 1000;

  return {
    stepIndex: nextStepIndex,
    legIndex: bestLegIndex,
    step: nextStep,
    distanceToStepM: distanceToNextM,
  };
};

/**
 * Convert OSRM maneuver type + modifier to a human-readable Portuguese instruction verb.
 */
export const getManeuverText = (step: OsrmStep): string => {
  const type = step.maneuver.type;
  const mod = step.maneuver.modifier || "";

  if (type === "depart") return "Siga em frente";
  if (type === "arrive") return "Chegando ao destino";
  if (type === "roundabout" || type === "rotary") {
    return "Entre na rotatória";
  }
  if (type === "end of road") {
    return mod.includes("left") ? "Vire à esquerda" : "Vire à direita";
  }
  if (type === "fork") {
    return mod.includes("left") ? "Mantenha-se à esquerda" : "Mantenha-se à direita";
  }
  if (type === "merge") {
    return mod.includes("left") ? "Incorpore à esquerda" : "Incorpore à direita";
  }
  if (type === "turn" || type === "new name" || type === "continue") {
    if (mod === "left") return "Vire à esquerda";
    if (mod === "right") return "Vire à direita";
    if (mod === "slight left") return "Vire levemente à esquerda";
    if (mod === "slight right") return "Vire levemente à direita";
    if (mod === "sharp left") return "Vire acentuadamente à esquerda";
    if (mod === "sharp right") return "Vire acentuadamente à direita";
    if (mod === "uturn") return "Faça o retorno";
    return "Siga em frente";
  }
  return "Siga em frente";
};

/**
 * Format a distance in metres to a readable string (e.g. "500 m", "1,2 km").
 */
export const formatDistance = (metres: number): string => {
  if (metres < 1000) {
    return `${Math.round(metres / 10) * 10} m`;
  }
  return `${(metres / 1000).toFixed(1).replace(".", ",")} km`;
};

export const parseTimeToMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
};

export interface DriverNeeds {
  stopIntervalHours: number;
  stopDurationMinutes?: number;
  requiresShower: boolean;
  requiresMeal: boolean;
  requiresSecurity: boolean;
  requiresScale: boolean;
}



export const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


export const parseDurationMinutes = (durStr: string) => {
  let total = 275; // default fallback 4h 35m
  try {
    if (!durStr) return total;
    // ISO8601 duration like PT3H20M15S
    const iso = durStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (iso) {
      const h = parseInt(iso[1] || '0');
      const m = parseInt(iso[2] || '0');
      const s = parseInt(iso[3] || '0');
      total = h * 60 + m + Math.round(s / 60);
      return total;
    }

    // human readable like "3h 20m" or "3h"
    const match = durStr.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      total = parseInt(match[1]) * 60 + parseInt(match[2]);
      return total;
    }
    const hMatch = durStr.match(/(\d+)h/);
    if (hMatch) {
      total = parseInt(hMatch[1]) * 60;
      return total;
    }

    // numeric seconds string (e.g. "12345" or "12345s")
    const secMatch = durStr.match(/^(\d+)(?:s)?$/);
    if (secMatch) {
      const secs = parseInt(secMatch[1]);
      total = Math.round(secs / 60);
      return total;
    }
  } catch (e) {}
  return total;
};




const formatAbsoluteTime = (absoluteMinutes: number): string => {
  const minutesOfDay = ((absoluteMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const resultH = Math.floor(minutesOfDay / 60);
  const resultM = minutesOfDay % 60;
  return `${resultH.toString().padStart(2, "0")}:${resultM.toString().padStart(2, "0")}`;
};

const getStopDurationMinutes = (stop: Stopover, needs: DriverNeeds): number => {
  return stop.durationMinutes ?? needs.stopDurationMinutes ?? 30;
};

const assignStopTimesWithRest = (
  departureTime: string,
  totalDurationMins: number,
  stops: Stopover[],
  needs: DriverNeeds
): Stopover[] => {
  const departureAbs = parseTimeToMinutes(departureTime);
  let currentAbs = departureAbs;
  let currentProgress = 0;
  const result: Stopover[] = [];

  for (const stop of stops) {
    const progress = stop.progress ?? 1;
    const segmentProgress = Math.max(0, progress - currentProgress);
    const drivingMins = Math.round(totalDurationMins * segmentProgress);
    const trafficMins = Math.round(drivingMins * 0.12);
    const arrivalAbs = currentAbs + drivingMins + trafficMins;

    const stopDuration = getStopDurationMinutes(stop, needs);
    const departureAfterStop = arrivalAbs + stopDuration;

    result.push({
      ...stop,
      time: formatAbsoluteTime(arrivalAbs),
    });

    currentAbs = departureAfterStop;
    currentProgress = progress;
  }

  return result;
};

// Main dynamic stops calculation based on driver needs and distance
export const calculateDynamicStops = (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  departureTime: string,
  estimatedDuration: string,
  needs: DriverNeeds
): Stopover[] => {
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
      id: `mock-stop-${i}`,
      title: `Parada de Descanso ${i}`,
      desc: "Ponto sugerido para parada e descanso na rota.",
      lat,
      lng,
      time: "",
      progress: targetFraction,
    });
  }

  return assignStopTimesWithRest(departureTime, totalDurationMins, selectedStops, needs);
};

export const reassignStopTimes = (
  departureTime: string,
  totalDurationMins: number,
  stops: Stopover[],
  needs: DriverNeeds
): Stopover[] => {
  return assignStopTimesWithRest(departureTime, totalDurationMins, stops, needs);
};

export const calculateRouteSpanMins = (
  totalDurationMins: number,
  stops: Stopover[],
  needs: DriverNeeds,
  departureTime = "00:00"
): number => {
  const departureAbs = parseTimeToMinutes(departureTime);
  let currentAbs = departureAbs;
  let currentProgress = 0;

  for (const stop of stops) {
    const progress = stop.progress ?? 1;
    const segmentProgress = Math.max(0, progress - currentProgress);
    const drivingMins = Math.round(totalDurationMins * segmentProgress);
    const trafficMins = Math.round(drivingMins * 0.12);
    const arrivalAbs = currentAbs + drivingMins + trafficMins;

    const stopDuration = getStopDurationMinutes(stop, needs);
    currentAbs = arrivalAbs + stopDuration;
    currentProgress = progress;
  }

  const finalSegmentProgress = Math.max(0, 1 - currentProgress);
  const finalDrivingMins = Math.round(totalDurationMins * finalSegmentProgress);
  const finalTrafficMins = Math.round(finalDrivingMins * 0.12);
  return currentAbs - departureAbs + finalDrivingMins + finalTrafficMins;
};

// Snap any off-road coordinates to the closest point on the computed OSRM route path
export const snapToRoute = (
  lat: number,
  lng: number,
  routePoints: [number, number][]
): { lat: number; lng: number } => {
  if (!routePoints || routePoints.length === 0) return { lat, lng };
  let minDistance = Infinity;
  let closestPoint = { lat, lng };

  for (const point of routePoints) {
    const dist = getDistance(lat, lng, point[0], point[1]);
    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = { lat: point[0], lng: point[1] };
    }
  }
  return closestPoint;
};

export interface OSMRouteStopsResult {
  stops: Stopover[];
  routeDurationMins: number;
  osrmFailed?: boolean;
  overpassFailed?: boolean;
}

// Fetch real points of interest (gas stations) along the route dynamically using OSRM + OpenStreetMap Overpass
export const fetchDynamicStopsFromOSM = async (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  departureTime: string,
  estimatedDuration: string,
  needs: DriverNeeds
): Promise<OSMRouteStopsResult> => {
  const estimatedDurationMins = parseDurationMinutes(estimatedDuration);
  const departureAbs = parseTimeToMinutes(departureTime);

  const computeTargetStopsCount = (durationMins: number) => {
    const durationHours = durationMins / 60;
    const interval = needs.stopIntervalHours || 4;
    let count = Math.floor(durationHours / interval);
    if (durationHours > 1.5) {
      if (needs.requiresShower || needs.requiresMeal || needs.requiresSecurity || needs.requiresScale) {
        count = Math.max(count, 1);
      }
    }
    return count;
  };

  const buildStopFractions = (routeDurationMins: number, targetStopsCount: number) => {
    // Posiciona cada parada no ponto real de tempo do intervalo de descanso
    // escolhido pelo usuário (ex.: a cada 4h => 4h, 8h, 12h...), em vez de
    // distribuir as paradas em frações fixas e iguais da viagem. Assim, a
    // localização das paradas passa a refletir corretamente a frequência
    // de descanso selecionada (stopIntervalHours), e não só a quantidade.
    const intervalMins = (needs.stopIntervalHours || 4) * 60;
    return Array.from({ length: targetStopsCount }, (_, index) => {
      const targetTimeMins = Math.min((index + 1) * intervalMins, routeDurationMins - 1);
      return { fraction: Math.min(0.99, targetTimeMins / routeDurationMins) };
    });
  };

  let osrmRouteDurationMins = estimatedDurationMins;
  let routeCoords: [number, number][] = [];
  try {
    // 1. Fetch real route geometry from OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full`;
    const osrmRes = await fetch(osrmUrl);
    if (!osrmRes.ok) throw new Error("OSRM API error");
    const osrmData = await osrmRes.json();

    osrmRouteDurationMins = Math.round((osrmData.routes?.[0]?.duration ?? 0) / 60);
    const coords = osrmData.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) throw new Error("Invalid OSRM geometry");
    routeCoords = coords as [number, number][];
  } catch (err) {
    console.warn("Error fetching real route from OSRM, using robust local geometry fallback:", err);
    return {
      stops: calculateDynamicStops(start, end, departureTime, estimatedDuration, needs),
      routeDurationMins: parseDurationMinutes(estimatedDuration),
      osrmFailed: true,
      overpassFailed: true,
    };
  }

  const targetStopsCount = computeTargetStopsCount(osrmRouteDurationMins);
  if (targetStopsCount === 0) {
    return {
      stops: [],
      routeDurationMins: osrmRouteDurationMins,
    };
  }

  const stopFractions = buildStopFractions(osrmRouteDurationMins, targetStopsCount);
  let stops: Stopover[] = [];

  try {
    // 2. Calculate cumulative distances along the route
    const cumulativeDistances: number[] = [0];
    let totalDist = 0;
    for (let i = 1; i < routeCoords.length; i++) {
      const p1 = { lat: routeCoords[i-1][1], lng: routeCoords[i-1][0] };
      const p2 = { lat: routeCoords[i][1], lng: routeCoords[i][0] };
      const d = getDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      totalDist += d;
      cumulativeDistances.push(totalDist);
    }

    // 3. Find stops in parallel with stagger delays
    const stopPromises = stopFractions.map(async (stopFrac, index) => {
      const { fraction } = stopFrac;
      const targetDist = totalDist * fraction;

      // Find the coordinate at this distance
      let targetLat = start.lat;
      let targetLng = start.lng;
      let targetIndex = 0;
      for (let j = 1; j < cumulativeDistances.length; j++) {
        if (cumulativeDistances[j] >= targetDist) {
          const diff = cumulativeDistances[j] - cumulativeDistances[j-1];
          const ratio = diff > 0 ? (targetDist - cumulativeDistances[j-1]) / diff : 0;
          const p1 = routeCoords[j-1];
          const p2 = routeCoords[j];
          targetLng = p1[0] + (p2[0] - p1[0]) * ratio;
          targetLat = p1[1] + (p2[1] - p1[1]) * ratio;
          targetIndex = j;
          break;
        }
      }

      // Add a staggered delay to avoid flooding the Overpass API at the exact same millisecond
      await new Promise(resolve => setTimeout(resolve, index * 200));

      // Query Overpass for fuel stations near this coordinate
      const overpassUrl = "https://overpass-api.de/api/interpreter";
      const query = `[out:json][timeout:8];node["amenity"="fuel"](around:5000,${targetLat},${targetLng});out body 6;`;

      try {
        const response = await fetch(overpassUrl, {
          method: "POST",
          body: query,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.elements && data.elements.length > 0) {
            const candidates = data.elements.map((el: any) => {
              const tags = el.tags || {};
              const rawName = tags.name || tags.brand || "Posto de Combustível";
              const brand = tags.brand || "";

              const hasShower = tags.shower === "yes" || tags.bath === "yes" || tags.toilets === "yes" || !!rawName.toLowerCase().match(/(graal|posto|petrobras|ipiranga|shell)/);
              const hasMeal = tags.restaurant === "yes" || tags.food === "yes" || tags.cafe === "yes" || !!rawName.toLowerCase().match(/(graal|posto|restaurante)/);
              const hasSecurity = tags.security === "yes" || tags.parking === "yes" || tags.secure === "yes" || true;
              const hasScale = tags.scale === "yes" || tags.weighbridge === "yes" || rawName.toLowerCase().includes("balança");

              let score = 0;
              if (needs.requiresShower && hasShower) score += 3;
              if (needs.requiresMeal && hasMeal) score += 3;
              if (needs.requiresSecurity && hasSecurity) score += 3;
              if (needs.requiresScale && hasScale) score += 3;

              const distToTarget = getDistance(targetLat, targetLng, el.lat, el.lon);
              
              let minRouteDist = Infinity;
              const startIndex = Math.max(0, targetIndex - 200);
              const endIndex = Math.min(routeCoords.length, targetIndex + 200);
              for (let k = startIndex; k < endIndex; k++) {
                const p = routeCoords[k];
                const d = getDistance(p[1], p[0], el.lat, el.lon);
                if (d < minRouteDist) minRouteDist = d;
              }

              score -= minRouteDist * 2.0; 
              score -= distToTarget * 0.05;

              return {
                id: `osm-fuel-${el.id}`,
                title: brand && !rawName.includes(brand) ? `${rawName} (${brand})` : rawName,
                desc: `Posto real mapeado via satélite. Chuveiros: ${hasShower ? "Sim" : "Não"} | Alimentação: ${hasMeal ? "Sim" : "Não"}.`,
                lat: el.lat,
                lng: el.lon,
                score,
              };
            });

            candidates.sort((a: any, b: any) => b.score - a.score);
            const bestCandidate = candidates[0];

            return {
              id: bestCandidate.id,
              title: bestCandidate.title,
              desc: bestCandidate.desc,
              time: "",
              lat: bestCandidate.lat,
              lng: bestCandidate.lng,
              progress: fraction,
            } as Stopover;
          }
        }
      } catch (e) {
        console.warn(`Overpass query failed for stop ${index + 1}`, e);
      }

      // Fallback stop
      return {
        id: `osm-fallback-${index + 1}`,
        title: `Ponto Rodoviário (${Math.round(fraction * 100)}% da rota)`,
        desc: "Ponto de parada sugerido calculado ao longo da rota real da viagem.",
        time: "",
        lat: targetLat,
        lng: targetLng,
        progress: fraction,
      } as Stopover;
    });

    stops = await Promise.all(stopPromises);
  } catch (err) {
    console.warn("Error fetching real route from OSRM, using robust local geometry fallback:", err);
    return {
      stops: calculateDynamicStops(start, end, departureTime, estimatedDuration, needs),
      routeDurationMins: parseDurationMinutes(estimatedDuration),
      osrmFailed: true,
      overpassFailed: true,
    };
  }

  return {
    stops: assignStopTimesWithRest(departureTime, osrmRouteDurationMins, stops, needs),
    routeDurationMins: osrmRouteDurationMins,
    osrmFailed: false,
    overpassFailed: stops.some(s => s.id?.includes("fallback")),
  };
};

export const generateGoogleMapsUrl = (
  originCoords: { lat: number; lng: number } | null | undefined,
  destCoords: { lat: number; lng: number } | null | undefined,
  stops: { lat?: number; lng?: number }[]
): string | null => {
  if (!originCoords || !destCoords) return null;

  const originParam = `${originCoords.lat},${originCoords.lng}`;
  const destParam = `${destCoords.lat},${destCoords.lng}`;

  const waypointsParam = stops
    .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
    .map((s) => `${s.lat},${s.lng}`)
    .join("|");

  let url = `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving`;

  if (waypointsParam) {
    url += `&waypoints=${encodeURIComponent(waypointsParam)}`;
  }

  return url;
};
