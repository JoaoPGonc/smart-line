export interface Stopover {
  id: string;
  title: string;
  desc: string;
  time: string;
  lat: number;
  lng: number;
}

export interface DriverNeeds {
  stopIntervalHours: number;
  requiresShower: boolean;
  requiresMeal: boolean;
  requiresSecurity: boolean;
  requiresScale: boolean;
}

export const REAL_STOPS_DATABASE = [
  {
    id: "posto-gigante",
    title: "Posto Gigante II (Ibiraçu - BR-101)",
    desc: "Parada excelente com banheiros limpos, restaurante amplo e segurança 24h.",
    lat: -19.8224,
    lng: -40.2741,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-prf-104",
    title: "Posto PRF Serra (BR-101 Km 251)",
    desc: "Posto de fiscalização da Polícia Rodoviária Federal, excelente ponto de apoio para pernoite e segurança.",
    lat: -20.1264,
    lng: -40.3082,
    hasShower: false,
    hasMeal: false,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-shell-serra",
    title: "Posto Shell Serra (BR-101)",
    desc: "Amplo pátio pavimentado, chuveiros gratuitos para motoristas e restaurante completo.",
    lat: -20.1448,
    lng: -40.2915,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-dco-serra",
    title: "Posto DCO Serra (BR-101)",
    desc: "Combustível de alta qualidade, conveniência e lanchonete rápida.",
    lat: -20.1751,
    lng: -40.2642,
    hasShower: false,
    hasMeal: true,
    hasSecurity: false,
    hasScale: false
  },
  {
    id: "graal-petropen",
    title: "Graal Petropen (Registro - BR-116)",
    desc: "Parada clássica com infraestrutura completa de alimentação, pátio seguro de pernoite e duchas.",
    lat: -24.4815,
    lng: -47.8284,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-shell-cubatao",
    title: "Posto Shell Cubatão (Anchieta-Imigrantes)",
    desc: "Posto estratégico com segurança de cargas de alto valor e balanças ativas.",
    lat: -23.8825,
    lng: -46.4251,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: true
  },
  {
    id: "graal-buenos-aires",
    title: "Graal Buenos Aires (Registro - BR-116)",
    desc: "Pátio amplo, banheiros de alta qualidade com chuveiros e alimentação diversificada.",
    lat: -24.6215,
    lng: -48.0125,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-alpino",
    title: "Posto Alpino II (Balsa Nova - BR-277)",
    desc: "Churrascaria de estrada, diesel S10 aditivado e banheiros gratuitos para motoristas.",
    lat: -25.4372,
    lng: -49.5248,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-shell-portal-serra",
    title: "Posto Portal da Serra (BR-277)",
    desc: "Segurança de última geração, excelente iluminação e pátio gigante.",
    lat: -25.4851,
    lng: -49.0232,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-prf-paranagua",
    title: "Posto PRF Paranaguá (BR-277)",
    desc: "Base operacional segura para motoristas regulamentarem horas ou tirarem dúvidas.",
    lat: -25.5684,
    lng: -48.6112,
    hasShower: false,
    hasMeal: false,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "ecopatio-paranagua",
    title: "Ecopátio Triagem (Paranaguá)",
    desc: "Triagem automatizada com pátio de descanso para caminhões vinculados ao Porto.",
    lat: -25.5532,
    lng: -48.5671,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: true
  },
  {
    id: "triagem-anchieta",
    title: "Pátio Triagem Anchieta (Santos)",
    desc: "Pátio regulamentado oficial para caminhões agendados no Porto de Santos.",
    lat: -23.9421,
    lng: -46.3684,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: true
  },
  {
    id: "posto-graal-resende",
    title: "Posto Graal Resende (Dutra - BR-116)",
    desc: "Infraestrutura moderna, alimentação 24h, chuveiros limpos e excelente segurança.",
    lat: -22.4746,
    lng: -44.4532,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-sakamoto",
    title: "Posto Sakamoto II (Guarulhos - BR-116)",
    desc: "Tradicional ponto de parada, pátio muito seguro, banho e conveniência completa.",
    lat: -23.4264,
    lng: -46.3852,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-arco-iris",
    title: "Posto Arco-Íris (Roseira - BR-116)",
    desc: "Posto modelo com serviços completos para motoristas de carga pesada.",
    lat: -22.8984,
    lng: -45.3045,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-graal-125",
    title: "Posto Graal 125 (Queluz - BR-116)",
    desc: "Excelente área de descanso, duchas privativas para motoristas e conveniência.",
    lat: -22.5356,
    lng: -44.7891,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-torre",
    title: "Posto da Torre (Betim - BR-381)",
    desc: "Pátio espaçoso e iluminado, restaurante mineiro de tradição e banho quente.",
    lat: -19.9845,
    lng: -44.1312,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-pipio",
    title: "Posto Pipio (Governador Valadares - BR-116)",
    desc: "Pátio pavimentado, abastecimento rápido e balança rodoviária de apoio.",
    lat: -18.8351,
    lng: -41.9722,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: true
  },
  {
    id: "posto-carreteiro",
    title: "Posto Carreteiro (Pedro Canário - BR-101)",
    desc: "Grande pátio de repouso, borracharia, mecânica leve e ótima alimentação.",
    lat: -18.0253,
    lng: -40.1509,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-caxuxa",
    title: "Posto Caxuxa (Araguari - BR-050)",
    desc: "Segurança total monitorada por câmeras, banheiros higienizados e borracharia.",
    lat: -18.6672,
    lng: -48.1824,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-prf-casimiro",
    title: "Posto PRF Casimiro de Abreu (BR-101)",
    desc: "Estacionamento policiado, alta segurança pública para descanso noturno.",
    lat: -22.4831,
    lng: -42.2012,
    hasShower: false,
    hasMeal: false,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-trevo-macae",
    title: "Posto Trevo de Macaé (BR-101)",
    desc: "Chuveiro quente gratuito ao abastecer, restaurante buffet livre e pátio murado.",
    lat: -22.3412,
    lng: -41.7725,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  },
  {
    id: "posto-soberano",
    title: "Posto Petrobras Soberano (Campos - BR-101)",
    desc: "Infraestrutura completa com churrascaria gaúcha, balança rodoviária e borracharia.",
    lat: -21.7854,
    lng: -41.3415,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: true
  },
  {
    id: "posto-safra-itapemirim",
    title: "Posto Safra (Itapemirim - BR-101)",
    desc: "Posto tradicional com atendimento especializado a frotas pesadas, pernoite seguro e banheiros.",
    lat: -20.8066,
    lng: -41.1341,
    hasShower: true,
    hasMeal: true,
    hasSecurity: true,
    hasScale: false
  }
];

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

export const getStopsForRoute = (destination: string, getStopTime: (percent: number) => string): Stopover[] => {
  const destLower = (destination || "").toLowerCase();
  
  if (destLower.includes("santos")) {
    return [
      {
        id: "graal-petropen",
        title: "Graal Petropen (BR-116)",
        desc: "Restaurante amplo, pátio iluminado e banho de motorista.",
        time: getStopTime(0.28),
        lat: -24.4815,
        lng: -47.8284,
      },
      {
        id: "shell-cubatao",
        title: "Posto Shell Cubatão (SP-055)",
        desc: "Balança de pesagem e segurança especializada de cargas.",
        time: getStopTime(0.70),
        lat: -23.8825,
        lng: -46.4251,
      },
      {
        id: "triagem-anchieta",
        title: "Pátio Triagem Anchieta (Santos)",
        desc: "Local oficial de parada prévia regulada por QR Code.",
        time: getStopTime(0.90),
        lat: -23.9421,
        lng: -46.3684,
      },
    ];
  } else if (destLower.includes("paranaguá") || destLower.includes("paranagua")) {
    return [
      {
        id: "posto-alpino",
        title: "Posto Alpino II (BR-277)",
        desc: "Churrascaria, diesel S10 aditivado e banheiros gratuitos.",
        time: getStopTime(0.28),
        lat: -25.4372,
        lng: -49.5248,
      },
      {
        id: "prf-paranagua",
        title: "Posto PRF Paranaguá (BR-277)",
        desc: "Monitoramento e apoio operacional da concessionária.",
        time: getStopTime(0.70),
        lat: -25.5684,
        lng: -48.6112,
      },
      {
        id: "ecopatio",
        title: "Ecopátio Triagem (Paranaguá)",
        desc: "Triagem automatizada integrada com controle portuário.",
        time: getStopTime(0.90),
        lat: -25.5532,
        lng: -48.5671,
      },
    ];
  } else {
    // Default: Tubarão / Vitória or General ES Route
    return [
      {
        id: "posto-gigante",
        title: "Posto Gigante II (Ibiraçu)",
        desc: "Restaurante completo, estacionamento de carga e combustíveis.",
        time: getStopTime(0.28),
        lat: -19.8224,
        lng: -40.2741,
      },
      {
        id: "posto-prf-es",
        title: "Posto PRF 104 (Serra)",
        desc: "Base operacional da PRF - Ponto seguro de parada.",
        time: getStopTime(0.70),
        lat: -20.1264,
        lng: -40.3082,
      },
      {
        id: "parada-porto-es",
        title: "Parada do Pátio (Vitória)",
        desc: "Triagem de apoio e alimentação rápida antes do porto.",
        time: getStopTime(0.90),
        lat: -20.2721,
        lng: -40.2514,
      },
    ];
  }
};

export const parseDurationMinutes = (durStr: string) => {
  let total = 275; // default fallback 4h 35m
  try {
    const match = durStr.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      total = parseInt(match[1]) * 60 + parseInt(match[2]);
    } else {
      const hMatch = durStr.match(/(\d+)h/);
      if (hMatch) total = parseInt(hMatch[1]) * 60;
    }
  } catch (e) {}
  return total;
};

export const computeStopTime = (startTime: string, durMins: number, percent: number) => {
  try {
    const [h, m] = startTime.split(":").map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      const offset = Math.round(durMins * percent);
      const total = h * 60 + m + offset;
      const resultH = Math.floor(total / 60) % 24;
      const resultM = total % 60;
      return `${resultH.toString().padStart(2, "0")}:${resultM.toString().padStart(2, "0")}`;
    }
  } catch (e) {}
  return "";
};

// Main dynamic stops calculation based on driver needs and distance
export const calculateDynamicStops = (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  departureTime: string,
  estimatedDuration: string,
  needs: DriverNeeds
): Stopover[] => {
  const totalDist = getDistance(start.lat, start.lng, end.lat, end.lng);
  const totalDurationMins = parseDurationMinutes(estimatedDuration);
  const durationHours = totalDurationMins / 60;

  // 1. Filter candidates within route corridor (elliptical corridor logic)
  let candidates = REAL_STOPS_DATABASE.filter(stop => {
    const d1 = getDistance(start.lat, start.lng, stop.lat, stop.lng);
    const d2 = getDistance(stop.lat, stop.lng, end.lat, end.lng);
    return (d1 + d2) < (totalDist * 1.35 + 30);
  });

  if (candidates.length === 0) {
    // Fallback if corridor is empty: just return some general stops
    return getStopsForRoute(end.lat.toString(), (percent) => computeStopTime(departureTime, totalDurationMins, percent));
  }

  // 2. Score each candidate based on truckers facility needs
  const scoredCandidates = candidates.map(stop => {
    let score = 0;
    if (needs.requiresShower && stop.hasShower) score += 3;
    if (needs.requiresMeal && stop.hasMeal) score += 3;
    if (needs.requiresSecurity && stop.hasSecurity) score += 3;
    if (needs.requiresScale && stop.hasScale) score += 3;

    // Also add a minor penalty for being too far off-route (extra deviation)
    const d1 = getDistance(start.lat, start.lng, stop.lat, stop.lng);
    const d2 = getDistance(stop.lat, stop.lng, end.lat, end.lng);
    const extraDeviation = (d1 + d2) - totalDist;
    score -= extraDeviation * 0.05; // -0.05 score point per extra km

    return { ...stop, score };
  });

  // Sort candidates by progress along the route (distance from origin) so they are ordered
  scoredCandidates.sort((a, b) => {
    const da = getDistance(start.lat, start.lng, a.lat, a.lng);
    const db = getDistance(start.lat, start.lng, b.lat, b.lng);
    return da - db;
  });

  // 3. Calculate quantity of stops dynamically based on distance, duration, and driver preferences
  // Standard driving intervals law (Lei 13.103) is 4h, but user can customize
  const interval = needs.stopIntervalHours || 4;
  let targetStopsCount = Math.floor(durationHours / interval);

  // Ensure at least 1 stop if distance is substantial and the trucker requested specific facilities
  if (targetStopsCount === 0 && durationHours > 1.5) {
    targetStopsCount = 1;
  }
  if (needs.requiresShower || needs.requiresMeal || needs.requiresSecurity || needs.requiresScale) {
    targetStopsCount = Math.max(targetStopsCount, 1);
  }

  // Cap stops count logically
  targetStopsCount = Math.min(targetStopsCount, scoredCandidates.length);
  if (targetStopsCount === 0) return [];

  // 4. Distribute stops evenly along the route list
  const selectedStops: Stopover[] = [];
  
  if (targetStopsCount === 1) {
    // Pick the highest scoring stop around the middle (30% to 70% of distance)
    const midPointCandidates = scoredCandidates.filter(c => {
      const distFraction = getDistance(start.lat, start.lng, c.lat, c.lng) / totalDist;
      return distFraction > 0.25 && distFraction < 0.75;
    });
    
    const pool = midPointCandidates.length > 0 ? midPointCandidates : scoredCandidates;
    // Sort by score
    const best = [...pool].sort((a, b) => b.score - a.score)[0];
    selectedStops.push({
      id: best.id,
      title: best.title,
      desc: best.desc,
      lat: best.lat,
      lng: best.lng,
      time: ""
    });
  } else {
    // Divide into targetStopsCount sectors and select the best scoring candidate from each sector
    for (let s = 0; s < targetStopsCount; s++) {
      const minFraction = s / targetStopsCount;
      const maxFraction = (s + 1) / targetStopsCount;

      const sectorPool = scoredCandidates.filter(c => {
        const distFraction = getDistance(start.lat, start.lng, c.lat, c.lng) / totalDist;
        return distFraction >= minFraction && distFraction <= maxFraction;
      });

      const pool = sectorPool.length > 0 ? sectorPool : scoredCandidates;
      const best = [...pool].sort((a, b) => b.score - a.score)[0];
      
      // Prevent duplicates
      if (best && !selectedStops.some(item => item.id === best.id)) {
        selectedStops.push({
          id: best.id,
          title: best.title,
          desc: best.desc,
          lat: best.lat,
          lng: best.lng,
          time: ""
        });
      }
    }
  }

  // Fallback if none got selected
  if (selectedStops.length === 0 && scoredCandidates.length > 0) {
    selectedStops.push({
      id: scoredCandidates[0].id,
      title: scoredCandidates[0].title,
      desc: scoredCandidates[0].desc,
      lat: scoredCandidates[0].lat,
      lng: scoredCandidates[0].lng,
      time: ""
    });
  }

  // Sort them again by distance to be absolutely sure they are ordered
  selectedStops.sort((a, b) => {
    const da = getDistance(start.lat, start.lng, a.lat, a.lng);
    const db = getDistance(start.lat, start.lng, b.lat, b.lng);
    return da - db;
  });

  // 5. Calculate estimated arrival times at each selected stop
  return selectedStops.map((stop, index) => {
    const distFraction = getDistance(start.lat, start.lng, stop.lat, stop.lng) / totalDist;
    const stopTime = computeStopTime(departureTime, totalDurationMins, distFraction);
    return {
      ...stop,
      time: stopTime
    };
  });
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

// Fetch real points of interest (gas stations) along the route dynamically using OpenStreetMap's Overpass API
export const fetchDynamicStopsFromOSM = async (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  departureTime: string,
  estimatedDuration: string,
  needs: DriverNeeds
): Promise<Stopover[]> => {
  const totalDist = getDistance(start.lat, start.lng, end.lat, end.lng);
  const totalDurationMins = parseDurationMinutes(estimatedDuration);
  const durationHours = totalDurationMins / 60;

  const interval = needs.stopIntervalHours || 4;
  let targetStopsCount = Math.floor(durationHours / interval);
  if (targetStopsCount === 0 && durationHours > 1.5) {
    targetStopsCount = 1;
  }
  if (needs.requiresShower || needs.requiresMeal || needs.requiresSecurity || needs.requiresScale) {
    targetStopsCount = Math.max(targetStopsCount, 1);
  }

  if (targetStopsCount === 0) {
    return [];
  }

  const stops: Stopover[] = [];

  try {
    // We will query fuel stations near the planned intervals (e.g. at 33% and 66% along the route)
    for (let i = 1; i <= targetStopsCount; i++) {
      const fraction = i / (targetStopsCount + 1);
      const targetLat = start.lat + (end.lat - start.lat) * fraction;
      const targetLng = start.lng + (end.lng - start.lng) * fraction;

      const overpassUrl = "https://overpass-api.de/api/interpreter";
      // Find fuel stations within a 15km radius of each computed midpoint
      const query = `[out:json][timeout:8];node["amenity"="fuel"](around:15000,${targetLat},${targetLng});out body 6;`;

      const response = await fetch(overpassUrl, {
        method: "POST",
        body: query,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (!response.ok) throw new Error("Overpass API error");
      const data = await response.json();

      if (data.elements && data.elements.length > 0) {
        // Map elements and score them based on driver needs
        const candidates = data.elements.map((el: any) => {
          const tags = el.tags || {};
          const rawName = tags.name || tags.brand || "Posto de Combustível";
          const brand = tags.brand || "";

          const hasShower =
            tags.shower === "yes" ||
            tags.bath === "yes" ||
            tags.toilets === "yes" ||
            rawName.toLowerCase().includes("graal") ||
            rawName.toLowerCase().includes("posto") ||
            rawName.toLowerCase().includes("petrobras") ||
            rawName.toLowerCase().includes("ipiranga") ||
            rawName.toLowerCase().includes("shell");

          const hasMeal =
            tags.restaurant === "yes" ||
            tags.food === "yes" ||
            tags.cafe === "yes" ||
            tags.amenity === "restaurant" ||
            rawName.toLowerCase().includes("graal") ||
            rawName.toLowerCase().includes("posto") ||
            rawName.toLowerCase().includes("restaurante");

          const hasSecurity =
            tags.security === "yes" ||
            tags.parking === "yes" ||
            tags.secure === "yes" ||
            rawName.toLowerCase().includes("graal") ||
            true; // large highway fuel stations in Brazil generally have parking & security

          const hasScale =
            tags.scale === "yes" ||
            tags.weighbridge === "yes" ||
            rawName.toLowerCase().includes("balança") ||
            rawName.toLowerCase().includes("balanca");

          let score = 0;
          if (needs.requiresShower && hasShower) score += 3;
          if (needs.requiresMeal && hasMeal) score += 3;
          if (needs.requiresSecurity && hasSecurity) score += 3;
          if (needs.requiresScale && hasScale) score += 3;

          // Penalty for distance from target partition midpoint
          const distToTarget = getDistance(targetLat, targetLng, el.lat, el.lon);
          score -= distToTarget * 0.15;

          return {
            id: `osm-fuel-${el.id}`,
            title: brand && !rawName.includes(brand) ? `${rawName} (${brand})` : rawName,
            desc: `Posto real mapeado via OpenStreetMap. Apoio para caminhoneiros com estacionamento de carga. Chuveiros: ${
              hasShower ? "Sim" : "Não"
            } | Alimentação: ${hasMeal ? "Sim" : "Não"}.`,
            lat: el.lat,
            lng: el.lon,
            score,
            time: "",
          };
        });

        // Sort by score
        candidates.sort((a: any, b: any) => b.score - a.score);
        const bestCandidate = candidates[0];

        bestCandidate.time = computeStopTime(departureTime, totalDurationMins, fraction);
        stops.push({
          id: bestCandidate.id,
          title: bestCandidate.title,
          desc: bestCandidate.desc,
          time: bestCandidate.time,
          lat: bestCandidate.lat,
          lng: bestCandidate.lng,
        });
      } else {
        // Fallback for this specific midpoint if Overpass returned nothing
        const stopTime = computeStopTime(departureTime, totalDurationMins, fraction);
        stops.push({
          id: `osm-fallback-${i}`,
          title: `Posto Rodoviário (Ponto ${i})`,
          desc: "Ponto de parada sugerido via cálculo de intervalo de condução da Lei 13.103.",
          time: stopTime,
          lat: targetLat,
          lng: targetLng,
        });
      }
    }
  } catch (err) {
    console.warn("Error fetching real stops from OSM Overpass, using robust local geometry fallback:", err);
    // Return standard local offline calculated stops (highly stable fallback)
    return calculateDynamicStops(start, end, departureTime, estimatedDuration, needs);
  }

  return stops;
};

