import React, { useState, useEffect, useRef } from "react";
import * as L from "leaflet";
import { getStopsForRoute, snapToRoute, OsrmLeg } from "../utils/routeUtils";
import { Compass, LocateFixed } from "lucide-react";
import { TrafficAlert } from "../types";

const routeCache = new Map<string, { routePoints: [number, number][]; legs: OsrmLeg[] }>();

// Ícones em SVG (mesmo estilo/paths da biblioteca lucide-react) usados dentro
// dos marcadores do Leaflet, já que L.divIcon precisa de HTML puro (não JSX).
const svgIcon = (paths: string, size = 14) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>
`;

const LUCIDE_MARKER_ICONS = {
  anchor: svgIcon('<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>'),
  flag: svgIcon('<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>'),
  check: svgIcon('<path d="M20 6 9 17l-5-5"/>', 11),
  siren: svgIcon('<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>'),
  construction: svgIcon('<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/>'),
  ban: svgIcon('<path d="M4.929 4.929 19.07 19.071"/><circle cx="12" cy="12" r="10"/>'),
};

interface MapComponentProps {
  routeMode?: "overview" | "active" | "static";
  activeStopIndex?: number;
  originCoords?: { lat: number; lng: number; name?: string } | null;
  destCoords?: { lat: number; lng: number; name?: string } | null;
  progress?: number; // Navigation progress along the route (0 to 1)
  userGpsCoords?: { lat: number; lng: number } | null;
  recenterTrigger?: number;
  showZoomControls?: boolean;
  showGpsIndicator?: boolean;
  stops?: Array<{ id: string; title: string; desc: string; lat: number; lng: number; time: string }> | null;
  alerts?: TrafficAlert[] | null;
  /** Called once OSRM route data has been loaded. Provides the polyline points and step data for GPS navigation. */
  onRouteReady?: (routePoints: [number, number][], legs: OsrmLeg[]) => void;
  /** Called whenever the route is being fetched/calculated, and again once it finishes (true = ainda carregando). */
  onLoadingChange?: (loading: boolean) => void;
}

export default function MapComponent({ 
  routeMode = "static", 
  activeStopIndex = 0,
  originCoords = null,
  destCoords = null,
  progress = 0.15,
  userGpsCoords = null,
  recenterTrigger = 0,
  showZoomControls = true,
  showGpsIndicator = true,
  stops = null,
  alerts = null,
  onRouteReady,
  onLoadingChange
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routePolylineGlowRef = useRef<L.Polyline | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(true);

  // Notifica o componente pai sempre que o estado de carregamento da rota mudar,
  // pra que outras telas (ex.: "Ver Meu Trajeto") possam mostrar um indicador
  // próprio e bloquear ações até o trajeto estar pronto no mapa.
  useEffect(() => {
    if (onLoadingChange) onLoadingChange(loadingRoute);
  }, [loadingRoute, onLoadingChange]);
  const [showRecenterBtn, setShowRecenterBtn] = useState(false);

  const routePointsRef = useRef<[number, number][]>([]);
  const truckMarkerRef = useRef<L.Marker | null>(null);
  const truckLatLngRef = useRef<L.LatLng | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const stopsRef = useRef(stops);
  useEffect(() => { stopsRef.current = stops; }, [stops]);

  // Distância mínima (em pixels) entre a localização atual e o centro da tela
  // pra considerar o mapa "descentralizado" e mostrar o botão de recentralizar.
  const OFF_CENTER_THRESHOLD_PX = 110;

  // Verifica se a localização (marcador do caminhão/GPS) saiu da área central
  // visível do mapa. Não move o mapa sozinho — só decide se mostra o botão.
  const checkOffCenter = (map: L.Map, latlng: L.LatLng) => {
    try {
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) return;
      const point = map.latLngToContainerPoint(latlng);
      const center = size.divideBy(2);
      const dist = Math.hypot(point.x - center.x, point.y - center.y);
      setShowRecenterBtn(dist > OFF_CENTER_THRESHOLD_PX);
    } catch (e) {
      // ignora falhas pontuais de projeção (ex: mapa ainda sem tamanho definido)
    }
  };

  const alertMarkersRef = useRef<L.Marker[]>([]);

  // Render traffic alerts on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    alertMarkersRef.current.forEach(m => m.remove());
    alertMarkersRef.current = [];

    if (!alerts || alerts.length === 0) return;

    alerts.forEach((alert) => {
      if (alert.lat === undefined || alert.lng === undefined) return;

      let iconHtml = LUCIDE_MARKER_ICONS.siren;
      let bgColor = "bg-red-500";
      
      if (alert.type === "maintenance" || alert.type === "other") {
        iconHtml = LUCIDE_MARKER_ICONS.construction;
        bgColor = "bg-orange-500";
      } else if (alert.type === "blocked") {
        iconHtml = LUCIDE_MARKER_ICONS.ban;
        bgColor = "bg-blue-600";
      }

      const alertIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center select-none animate-bounce">
            <div class="w-6 h-6 rounded-full ${bgColor} border-2 border-white flex items-center justify-center text-white shadow-lg text-[10px]">
              ${iconHtml}
            </div>
          </div>
        `,
        className: "custom-leaflet-marker",
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      const marker = L.marker([alert.lat, alert.lng], { icon: alertIcon })
        .addTo(map)
        .bindPopup(`<b>${alert.title}</b><br/>${alert.description}<br/><small>${alert.location}</small>`);

      alertMarkersRef.current.push(marker);
    });
  }, [alerts, loadingRoute]);

  // Default Espirito Santo coordinates
  const defaultOrigin = { lat: -18.0253, lng: -40.1509, name: "Posto Carreteiro (Pedro Canário)" };
  const defaultDest = { lat: -20.2831, lng: -40.2435, name: "Porto de Tubarão (Vitória)" };

  const startCoords = originCoords && typeof originCoords.lat === "number" && !isNaN(originCoords.lat) && typeof originCoords.lng === "number" && !isNaN(originCoords.lng)
    ? originCoords 
    : defaultOrigin;

  const endCoords = destCoords && typeof destCoords.lat === "number" && !isNaN(destCoords.lat) && typeof destCoords.lng === "number" && !isNaN(destCoords.lng)
    ? destCoords 
    : defaultDest;

  // Helper to draw or update the truck marker position
  const updateTruckPosition = (map: L.Map, points: [number, number][]) => {
    if (routeMode !== "active") return;
    if (!points || !Array.isArray(points) || points.length === 0) return;
    
    let lat = 0;
    let lng = 0;

    if (userGpsCoords) {
      lat = userGpsCoords.lat;
      lng = userGpsCoords.lng;
    } else if (points.length > 0) {
      const targetIndex = Math.min(Math.floor(points.length * progress), points.length - 1);
      lat = points[targetIndex][0];
      lng = points[targetIndex][1];
    } else {
      return;
    }

    if (truckMarkerRef.current) {
      truckMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const gpsDotIcon = L.divIcon({
        html: `
          <div class="flex flex-col items-center select-none">
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 rounded-full bg-blue-500/40" style="animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center z-10">
                <div class="w-2 h-2 rounded-full bg-white shadow-inner"></div>
              </div>
            </div>
          </div>
        `,
        className: "custom-leaflet-marker",
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });
      truckMarkerRef.current = L.marker([lat, lng], { icon: gpsDotIcon }).addTo(map);
      truckMarkerRef.current.bindPopup("<b>Sua Localização (GPS)</b><br/>Sinal ativo em tempo real");
    }

    // Guarda a posição atual pra uso no botão de recentralizar e no listener de 'moveend'.
    // Não move mais o mapa automaticamente — o usuário decide quando recentralizar,
    // clicando no botão que só aparece quando a localização sai da área central da tela.
    const latlng = L.latLng(lat, lng);
    truckLatLngRef.current = latlng;
    checkOffCenter(map, latlng);
  };

  // Initialize Leaflet Map and fetch roads
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any existing map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if (truckMarkerRef.current) {
      truckMarkerRef.current.remove();
      truckMarkerRef.current = null;
    }

    // Set center coordinates & fit bounds
    const bounds = L.latLngBounds([
      [startCoords.lat, startCoords.lng],
      [endCoords.lat, endCoords.lng]
    ]);

    // Create Leaflet Map Instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      touchZoom: true
    });

    mapInstanceRef.current = map;

    // Sempre que o mapa se move (arrasto do usuário, zoom, ou qualquer pan
    // programático), reavalia se a localização atual ainda está visível perto
    // do centro — se não estiver, mostra o botão de recentralizar.
    const handleMoveEnd = () => {
      if (routeMode === "active" && truckLatLngRef.current && mapInstanceRef.current) {
        checkOffCenter(mapInstanceRef.current, truckLatLngRef.current);
      }
    };
    map.on("moveend", handleMoveEnd);

    // Instantly set fallback view so map always has valid size/center
    map.setView([startCoords.lat, startCoords.lng], 10);

    // Center map and zoom to fit bounds inside a setTimeout to let parent container render complete
    const resizeAndFitTimer = setTimeout(() => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.invalidateSize();
      const currentSize = mapInstanceRef.current.getSize();
      if (currentSize.x > 0 && currentSize.y > 0 && bounds.isValid()) {
        try {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        } catch (e) {
          console.warn("fitBounds failed, falling back to setView", e);
        }
      }
    }, 150);

    // Add Free OpenStreetMap Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    // 1. Origin Marker
    const originIcon = L.divIcon({
      html: `
        <div class="flex flex-col items-center select-none">
          <div class="w-7 h-7 rounded-full bg-blue-900 border-2 border-white flex items-center justify-center text-white shadow-lg font-bold text-xs">
            ${LUCIDE_MARKER_ICONS.anchor}
          </div>
          <div class="bg-blue-950 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap mt-1 border border-blue-800">
            ${(() => { const parts = (startCoords.name || "Partida").split(",").map(p => p.trim()).filter(Boolean); return parts.find(p => !/^\d+$/.test(p)) || parts[0] || "Partida"; })()}
          </div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [80, 50],
      iconAnchor: [40, 35]
    });
    L.marker([startCoords.lat, startCoords.lng], { icon: originIcon })
      .addTo(map)
      .bindPopup(`<b>Ponto de Partida</b><br/>${startCoords.name || "Origem"}`);

    // 2. Destination Marker
    const destIcon = L.divIcon({
      html: `
        <div class="flex flex-col items-center select-none">
          <div class="w-7 h-7 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-lg font-bold text-xs animate-bounce">
            ${LUCIDE_MARKER_ICONS.flag}
          </div>
          <div class="bg-red-950 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap mt-1 border border-red-800">
            ${(() => { const parts = (endCoords.name || "Destino").split(",").map(p => p.trim()).filter(Boolean); return parts.find(p => !/^\d+$/.test(p)) || parts[0] || "Destino"; })()}
          </div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [80, 50],
      iconAnchor: [40, 35]
    });
    L.marker([endCoords.lat, endCoords.lng], { icon: destIcon })
      .addTo(map)
      .bindPopup(`<b>Destino Final</b><br/>${endCoords.name || "Destino"}`);

    // 3. Helper to draw stops correctly on any route path
    const drawStops = (points: [number, number][]) => {
      stopMarkersRef.current.forEach(m => m.remove());
      stopMarkersRef.current = [];
      if (!points || !Array.isArray(points) || points.length === 0) return;

      const stopsToDraw = stopsRef.current && stopsRef.current.length > 0
        ? stopsRef.current
        : getStopsForRoute(endCoords.name || "", () => "");

      stopsToDraw.forEach((stop, idx) => {
        // Snap raw coordinates to the computed OSRM road polyline to prevent visual drift
        const snapped = snapToRoute(stop.lat, stop.lng, points);
        const lat = snapped.lat;
        const lng = snapped.lng;

        const isChecked = activeStopIndex > idx;
        const stopIcon = L.divIcon({
          html: `
            <div class="flex flex-col items-center select-none">
              <div class="w-5 h-5 rounded-full ${isChecked ? 'bg-emerald-500' : 'bg-orange-500'} border-2 border-white flex items-center justify-center text-white shadow-md font-bold text-[9px]">
                ${isChecked ? LUCIDE_MARKER_ICONS.check : (idx + 1).toString()}
              </div>
              <div class="bg-slate-900/90 text-slate-200 text-[7px] font-sans font-semibold px-1 py-0.5 rounded shadow-sm whitespace-nowrap mt-1 border border-slate-800">
                ${stop.title || (stop as any).name || "Parada"}
              </div>
            </div>
          `,
          className: "custom-leaflet-marker",
          iconSize: [80, 40],
          iconAnchor: [40, 30]
        });

        const marker = L.marker([lat, lng], { icon: stopIcon })
          .addTo(map)
          .bindPopup(`<b>Parada ${idx + 1}: ${stop.title || (stop as any).name || "Parada"}</b><br/>${stop.desc}`);

        stopMarkersRef.current.push(marker);
      });
    };

    // 4. Fetch dynamic turn-by-turn road-conforming route from FREE OSRM API
    setLoadingRoute(true);
    
    const coordsList = [
      `${startCoords.lng},${startCoords.lat}`
    ];
    
    const stopsToRoute = stopsRef.current && stopsRef.current.length > 0
      ? stopsRef.current
      : getStopsForRoute(endCoords.name || "", () => "");

    stopsToRoute.forEach(stop => {
      coordsList.push(`${stop.lng},${stop.lat}`);
    });
    
    coordsList.push(`${endCoords.lng},${endCoords.lat}`);
    
    const routeKey = coordsList.join(";");

    // Só precisamos das instruções de manobra (steps) e da geometria em resolução
    // máxima quando estamos de fato navegando (GPS turn-by-turn). Nas telas de
    // "ver meu trajeto" / visão geral (routeMode "static"/"overview") isso é peso
    // morto: a resposta do OSRM fica maior e mais lenta de calcular/baixar/renderizar
    // sem nenhum ganho visual. Isso é a causa principal do carregamento lento do mapa.
    const needsTurnByTurn = routeMode === "active";
    const cacheKey = needsTurnByTurn ? `${routeKey}|steps` : routeKey;
    const cachedRoute = routeCache.get(cacheKey);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${routeKey}?overview=${needsTurnByTurn ? "full" : "simplified"}&geometries=geojson&steps=${needsTurnByTurn}`;

    const processRouteData = (data: any) => {
      if (!mapInstanceRef.current || mapInstanceRef.current !== map) return;

      if (data.routes && data.routes[0]) {
        const rawGeometry = data.routes[0].geometry.coordinates;
        const routePoints: [number, number][] = rawGeometry.map((pt: [number, number]) => [pt[1], pt[0]] as [number, number]);

        routePointsRef.current = routePoints;
        routeCache.set(cacheKey, { routePoints, legs: data.routes[0].legs ?? [] });

        // Draw high contrast outer glowing line
        const polyline = L.polyline(routePoints, {
          color: "#2563eb",
          weight: 5,
          opacity: 0.85,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map);

        // Inner glowing fine path
        const polylineGlow = L.polyline(routePoints, {
          color: "#60a5fa",
          weight: 2,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map);

        routePolylineRef.current = polyline;
        routePolylineGlowRef.current = polylineGlow;

        // Draw stops snapped directly onto the calculated road route!
        drawStops(routePoints);

        // Expose route data (polyline + OSRM steps) to parent for real GPS navigation
        const legs: OsrmLeg[] = data.routes[0].legs ?? [];
        if (onRouteReady) {
          onRouteReady(routePoints, legs);
        }

        // Place initial truck if active
        if (routeMode === "active") {
          updateTruckPosition(map, routePoints);
        }
      } else {
        throw new Error("No route coordinates returned");
      }
    };

    if (cachedRoute) {
      setLoadingRoute(false);
      routePointsRef.current = cachedRoute.routePoints;

      const polyline = L.polyline(cachedRoute.routePoints, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      const polylineGlow = L.polyline(cachedRoute.routePoints, {
        color: "#60a5fa",
        weight: 2,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      routePolylineRef.current = polyline;
      routePolylineGlowRef.current = polylineGlow;
      drawStops(cachedRoute.routePoints);

      if (onRouteReady) {
        onRouteReady(cachedRoute.routePoints, cachedRoute.legs);
      }
      if (routeMode === "active") {
        updateTruckPosition(map, cachedRoute.routePoints);
      }
    } else {
      // Timeout de segurança: o servidor público do OSRM às vezes demora muito
      // ou fica indisponível. Em vez de deixar o usuário esperando indefinidamente
      // olhando pro "Traçando Rota...", damos um limite de 10s e caímos no traçado
      // alternativo (linha reta) — o mapa nunca fica preso carregando pra sempre.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      fetch(osrmUrl, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error("OSRM limit reached or network error");
          return res.json();
        })
        .then(processRouteData)
        .catch((err) => {
          if (!mapInstanceRef.current || mapInstanceRef.current !== map) return;

          console.warn("Falling back to direct geodesic route polyline:", err);
          const fallbackPoints: [number, number][] = [
            [startCoords.lat, startCoords.lng],
            [endCoords.lat, endCoords.lng]
          ];
          routePointsRef.current = fallbackPoints;

          const polyline = L.polyline(fallbackPoints, {
            color: "#dc2626",
            weight: 4,
            opacity: 0.75,
            dashArray: "6, 8",
            lineCap: "round"
          }).addTo(map);

          routePolylineRef.current = polyline;
          drawStops(fallbackPoints);

          if (routeMode === "active") {
            updateTruckPosition(map, fallbackPoints);
          }
        })
        .finally(() => {
          clearTimeout(timeoutId);
          if (mapInstanceRef.current && mapInstanceRef.current === map) {
            setLoadingRoute(false);
          }
        });
    }

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(resizeAndFitTimer);
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [routeMode, startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng]); // stops removido das deps: usa stopsRef para evitar remontagem do mapa

  // 5. Update truck position smoothly when the progress or userGpsCoords updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || routeMode !== "active") return;

    const points = routePointsRef.current;
    updateTruckPosition(map, points);
  }, [progress, userGpsCoords, routeMode]);

  // 6. Recenter map bounds on demand when recenterTrigger changes
  useEffect(() => {
    if (recenterTrigger && mapInstanceRef.current) {
      const bounds = L.latLngBounds([
        [startCoords.lat, startCoords.lng],
        [endCoords.lat, endCoords.lng]
      ]);
      if (bounds.isValid()) {
        try {
          mapInstanceRef.current.invalidateSize();
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
        } catch (e) {
          console.warn("Recenter fitBounds failed:", e);
        }
      }
    }
  }, [recenterTrigger, startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // Centraliza o mapa na localização atual do usuário, só quando ele pede
  // (clicando no botão) — nunca automaticamente. Posiciona a localização um
  // pouco acima do centro vertical da tela, deixando espaço pro card
  // flutuante que fica na parte de baixo da tela de navegação ativa.
  const handleRecenterOnUser = () => {
    const map = mapInstanceRef.current;
    const latlng = truckLatLngRef.current;
    if (!map || !latlng) return;

    const targetZoom = Math.max(map.getZoom(), 15);
    const size = map.getSize();

    const desiredScreenPoint = L.point(size.x / 2, size.y * 0.35);
    const centerScreenPoint = size.divideBy(2);
    const screenOffset = desiredScreenPoint.subtract(centerScreenPoint);

    const userPoint = map.project(latlng, targetZoom);
    const newCenterPoint = userPoint.subtract(screenOffset);
    const newCenter = map.unproject(newCenterPoint, targetZoom);

    map.setView(newCenter, targetZoom, { animate: true });
    setShowRecenterBtn(false);
  };

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl select-none flex flex-col justify-between">
      {/* Map HTML container */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 w-full h-full" style={{ background: "#0f172a" }}></div>

      {/* Zoom controls overlay */}
      {showZoomControls && (
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <div className="p-1.5 bg-slate-900/95 border border-slate-800 rounded-xl flex flex-col gap-1 items-center shadow-lg backdrop-blur-md">
            <button 
              onClick={handleZoomIn}
              className="text-slate-200 hover:text-white font-black w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 active:scale-90 transition text-sm cursor-pointer"
            >
              +
            </button>
            <div className="h-[1px] w-5 bg-slate-800"></div>
            <button 
              onClick={handleZoomOut}
              className="text-slate-200 hover:text-white font-black w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800 active:scale-90 transition text-sm cursor-pointer"
            >
              -
            </button>
          </div>
        </div>
      )}

      {/* Botão de recentralizar: só aparece quando a localização sai da área central da tela. Nunca centraliza sozinho — só quando o usuário toca aqui. */}
      {routeMode === "active" && showRecenterBtn && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
          <button
            onClick={handleRecenterOnUser}
            className="bg-blue-600 hover:bg-blue-500 active:scale-90 text-white p-3 rounded-full shadow-2xl border-2 border-blue-400/40 transition flex items-center justify-center"
            title="Centralizar na minha localização"
          >
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Map loading/geocoding indicator */}
      {showGpsIndicator && (
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          <div className="bg-slate-900/95 text-slate-200 text-[10px] font-mono py-1.5 px-2.5 rounded-lg border border-slate-800 backdrop-blur-md flex items-center gap-1.5 shadow-md">
            <span className={`w-2 h-2 rounded-full ${loadingRoute ? "bg-amber-500 animate-pulse" : "bg-blue-500 animate-pulse"}`}></span>
            {loadingRoute ? "Traçando Rota..." : "Navegação por GPS"}
          </div>
        </div>
      )}

    </div>
  );
}
