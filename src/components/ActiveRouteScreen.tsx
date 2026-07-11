import { formatDisplayDate, formatAddress } from "../formatDateHelper";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ScreenId, Appointment, TrafficAlert } from "../types";
import MapComponent from "./MapComponent";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  Navigation,
  AlertTriangle,
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  RefreshCw,
  Flag,
  RotateCcw,
  GitMerge,
  ChevronsRight,
  MapPin,
} from "lucide-react";
import {
  getStopsForRoute,
  parseDurationMinutes,
  computeStopTime,
  getProgressAlongRoute,
  findCurrentStep,
  getManeuverText,
  formatDistance,
  getDistance,
  getClosestRoutePointIndex,
  getRouteDistanceBetweenPoints,
  snapToRoute,
  OsrmLeg,
  OsrmStep,
} from "../utils/routeUtils";

interface ActiveRouteScreenProps {
  onNavigate: (screen: ScreenId) => void;
  appointment?: Appointment | null;
  originCoords?: { lat: number; lng: number; name?: string } | null;
  destCoords?: { lat: number; lng: number; name?: string } | null;
  checkedStops?: boolean[];
}

// ─── Maneuver icon selector ───────────────────────────────────────────────────
function ManeuverIcon({
  step,
  className,
}: {
  step: OsrmStep | null;
  className?: string;
}) {
  const cls = className ?? "w-6 h-6";
  if (!step) return <ArrowUp className={cls} />;
  const type = step.maneuver.type;
  const mod = step.maneuver.modifier ?? "";

  if (type === "arrive") return <Flag className={cls} />;
  if (type === "roundabout" || type === "rotary") return <RotateCcw className={cls} />;
  if (type === "fork" || type === "merge") return <GitMerge className={cls} />;
  if (type === "end of road") {
    return mod.includes("left") ? (
      <CornerUpLeft className={cls} />
    ) : (
      <CornerUpRight className={cls} />
    );
  }
  if (type === "turn" || type === "new name" || type === "continue") {
    if (mod === "left" || mod === "sharp left") return <CornerUpLeft className={cls} />;
    if (mod === "right" || mod === "sharp right") return <CornerUpRight className={cls} />;
    if (mod === "slight left") return <CornerUpLeft className={cls} />;
    if (mod === "slight right") return <CornerUpRight className={cls} />;
    if (mod === "uturn") return <RefreshCw className={cls} />;
  }
  return <ArrowUp className={cls} />;
}

// ─── Alert urgency levels based on distance to next maneuver ─────────────────
type AlertLevel = "info" | "warn" | "danger" | "arrive";

function getAlertLevel(distM: number, stepType: string): AlertLevel {
  if (stepType === "arrive") return "arrive";
  if (distM <= 100) return "danger";
  if (distM <= 500) return "warn";
  return "info";
}

const ALERT_STYLES: Record<AlertLevel, { banner: string; icon: string; badge: string }> = {
  info:   { banner: "bg-emerald-950/95 border-emerald-800",   icon: "text-emerald-400",  badge: "bg-blue-900/40 text-blue-300 border-blue-800/30" },
  warn:   { banner: "bg-amber-950/95 border-amber-800",       icon: "text-amber-400 animate-pulse",   badge: "bg-amber-900/40 text-amber-300 border-amber-700/40" },
  danger: { banner: "bg-red-950/95 border-red-800",           icon: "text-red-400 animate-bounce",    badge: "bg-red-900/40 text-red-300 border-red-700/40" },
  arrive: { banner: "bg-blue-950/95 border-blue-800",         icon: "text-blue-400 animate-pulse",    badge: "bg-blue-900/40 text-blue-300 border-blue-800/30" },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ActiveRouteScreen({
  onNavigate,
  appointment,
  originCoords,
  destCoords,
  checkedStops = [false, false, false],
}: ActiveRouteScreenProps) {
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const cached = localStorage.getItem("smartline_last_gps");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [isUsingRealGps, setIsUsingRealGps] = useState(false);
  const [speed, setSpeed] = useState(0);

  // Route data received from MapComponent
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeLegs, setRouteLegs] = useState<OsrmLeg[]>([]);
  const routeReadyRef = useRef(false);
  // Refs to read latest route data inside GPS effect without adding them as deps
  const routePointsRef = useRef<[number, number][]>([]);
  const routeLegsRef = useRef<OsrmLeg[]>([]);

  // Derived navigation state
  const [progress, setProgress] = useState(0);
  const [distanceRemainingKm, setDistanceRemainingKm] = useState<number | null>(null);
  const [nextStep, setNextStep] = useState<OsrmStep | null>(null);
  const [distToNextStepM, setDistToNextStepM] = useState<number>(99999);

  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);

  useEffect(() => {
    const q = query(collection(db, "traffic_alerts"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const activeAlerts: TrafficAlert[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (data.expiresAt > now && (data.votesDown || 0) < 3) {
          activeAlerts.push({
            id: docSnap.id,
            ...data
          } as TrafficAlert);
        }
      });
      setAlerts(activeAlerts);
    });
    return () => unsubscribe();
  }, []);

  // ── Receive OSRM route data from MapComponent ──────────────────────────────
  const handleRouteReady = useCallback(
    (points: [number, number][], legs: OsrmLeg[]) => {
      setRoutePoints(points);
      setRouteLegs(legs);
      routePointsRef.current = points;
      routeLegsRef.current = legs;
      routeReadyRef.current = true;

      // If we already have GPS coords, compute immediately
      setUserGpsCoords(prev => {
        if (prev) {
          const { progress: p, distanceRemainingKm: d } = getProgressAlongRoute(
            prev.lat,
            prev.lng,
            points
          );
          setProgress(p);
          setDistanceRemainingKm(d);

          const { step, distanceToStepM } = findCurrentStep(prev.lat, prev.lng, legs);
          setNextStep(step);
          setDistToNextStepM(distanceToStepM);
        }
        return prev;
      });
    },
    []
  );

  // ── Real-time GPS tracker ──────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, speed: gpsSpeed } = position.coords;
      const coords = { lat: latitude, lng: longitude };
      setUserGpsCoords(coords);
      localStorage.setItem("smartline_last_gps", JSON.stringify(coords));
      setIsUsingRealGps(true);

      if (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed > 0) {
        setSpeed(Math.round(gpsSpeed * 3.6));
      } else {
        setSpeed(0);
      }

      // Recalculate real progress & next step whenever GPS updates
      if (routeReadyRef.current && routePointsRef.current.length > 0) {
        const { progress: p, distanceRemainingKm: d } = getProgressAlongRoute(
          latitude,
          longitude,
          routePointsRef.current
        );
        setProgress(p);
        setDistanceRemainingKm(d);
      }

      if (routeReadyRef.current && routeLegsRef.current.length > 0) {
        const { step, distanceToStepM } = findCurrentStep(latitude, longitude, routeLegsRef.current);
        setNextStep(step);
        setDistToNextStepM(distanceToStepM);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("GPS error:", error.message);
      setIsUsingRealGps(false);
    };

    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // ← sem deps: o watchPosition sobe apenas 1x e lê os dados pelos refs

  // ── Recalculate when route data arrives but GPS was already available ──────
  useEffect(() => {
    if (!userGpsCoords || routePoints.length === 0) return;
    const { progress: p, distanceRemainingKm: d } = getProgressAlongRoute(
      userGpsCoords.lat,
      userGpsCoords.lng,
      routePoints
    );
    setProgress(p);
    setDistanceRemainingKm(d);
  }, [routePoints]);

  useEffect(() => {
    if (!userGpsCoords || routeLegs.length === 0) return;
    const { step, distanceToStepM } = findCurrentStep(
      userGpsCoords.lat,
      userGpsCoords.lng,
      routeLegs
    );
    setNextStep(step);
    setDistToNextStepM(distanceToStepM);
  }, [routeLegs]);

  // ── Stops ──────────────────────────────────────────────────────────────────
  const durMins = parseDurationMinutes(appointment?.drivingDuration || appointment?.estimatedDuration || "4h 35m");
  // useMemo garante que o array só muda quando os dados do agendamento mudam de verdade,
  // evitando que o MapComponent remonte o mapa a cada render por referência nova.
  const stops = useMemo(() => {
    if (appointment?.customStops && appointment.customStops.length > 0) {
      return appointment.customStops;
    }
    return getStopsForRoute(
      appointment?.destination || "Porto de Tubarão",
      (percent, index) => computeStopTime(appointment?.time || "11:30", durMins, percent, index)
    );
  }, [appointment?.customStops, appointment?.destination, appointment?.time, durMins]);

  const nextUncheckedStopIndex = checkedStops.findIndex((c) => !c);
  const activeStopIndex =
    nextUncheckedStopIndex !== -1 && nextUncheckedStopIndex < stops.length
      ? nextUncheckedStopIndex
      : stops.length;

  const getNextStopTitle = () => {
    if (activeStopIndex < stops.length) {
      return `Parada ${activeStopIndex + 1}: ${stops[activeStopIndex].title}`;
    }
    return `Destino Final: ${formatAddress(appointment?.destination, "Porto")}`;
  };

  const getNextStopDesc = () => {
    if (activeStopIndex < stops.length) {
      return stops[activeStopIndex].desc;
    }
    return "Sua carga está pronta para descarregar.";
  };

  // ── Dynamic navigation instruction ────────────────────────────────────────
  const isRouteLoaded = routePoints.length > 0;
  const isArrived = progress >= 0.98 || nextStep?.maneuver.type === "arrive";

  const alertLevel: AlertLevel = isArrived
    ? "arrive"
    : getAlertLevel(distToNextStepM, nextStep?.maneuver.type ?? "");

  const alertStyle = ALERT_STYLES[alertLevel];

  const getBannerInstruction = (): string => {
    if (!isRouteLoaded) return "Calculando rota…";
    if (isArrived) return "Chegando ao destino!";
    if (!nextStep) return "Siga em frente";

    const manText = getManeuverText(nextStep);
    const streetName = nextStep.name?.trim();

    if (alertLevel === "info") {
      // Far from next turn: show current-road instruction
      const distStr = formatDistance(distToNextStepM);
      return streetName
        ? `Siga por ${streetName} por ${distStr}`
        : `Siga em frente por ${distStr}`;
    }

    // Close to turn (warn/danger): show countdown
    const distStr = formatDistance(distToNextStepM);
    return streetName
      ? `Em ${distStr}, ${manText} na ${streetName}`
      : `Em ${distStr}, ${manText}`;
  };

  const getBannerSubtext = (): string => {
    if (!isRouteLoaded) return "Aguardando dados da rota OSRM…";
    if (isArrived) return "Prepare o QR Code para o portão de triagem.";
    if (alertLevel === "danger") return "⚠️ Realize a manobra agora!";
    if (alertLevel === "warn") return "Prepare-se para realizar a manobra em breve.";
    if (speed > 0) return `Velocidade atual: ${speed} km/h`;
    return isUsingRealGps ? "Navegando via GPS em tempo real." : "Aguardando sinal GPS…";
  };

  const getBadgeLabel = (): string => {
    if (!isRouteLoaded) return "—";
    if (isArrived) return "Destino";
    return formatDistance(distToNextStepM);
  };

  // ── Distance & ETA ─────────────────────────────────────────────────────────
  // Use real remaining distance if available, otherwise fall back to haversine estimate
  const getHaversineTotal = (): number => {
    if (!originCoords || !destCoords) return 272;
    const R = 6371;
    const dLat = ((destCoords.lat - originCoords.lat) * Math.PI) / 180;
    const dLon = ((destCoords.lng - originCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((originCoords.lat * Math.PI) / 180) *
        Math.cos((destCoords.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const effectiveRemainingKm =
    distanceRemainingKm !== null
      ? Math.round(distanceRemainingKm)
      : Math.max(0, Math.round(getHaversineTotal() * (1 - progress)));

  let targetRemainingKm = effectiveRemainingKm;
  let isNextTargetDest = true;
  let targetTitle = "DESTINO";

  if (activeStopIndex < stops.length) {
    isNextTargetDest = false;
    const stop = stops[activeStopIndex];
    targetTitle = `PARADA ${activeStopIndex + 1}`;

    if (routePoints.length > 0) {
      const currentLat = userGpsCoords?.lat ?? originCoords?.lat;
      const currentLng = userGpsCoords?.lng ?? originCoords?.lng;
      if (currentLat !== undefined && currentLng !== undefined) {
        targetRemainingKm = Math.round(
          getRouteDistanceBetweenPoints(
            currentLat,
            currentLng,
            stop.lat,
            stop.lng,
            routePoints
          )
        );
      }
    } else if (userGpsCoords) {
      targetRemainingKm = Math.round(getDistance(userGpsCoords.lat, userGpsCoords.lng, stop.lat, stop.lng));
    } else if (originCoords) {
      targetRemainingKm = Math.round(getDistance(originCoords.lat, originCoords.lng, stop.lat, stop.lng));
    }
  }

  const targetRemainingMinutesTotal = Math.round((targetRemainingKm / 65) * 60);
  const targetRemainingHours = Math.floor(targetRemainingMinutesTotal / 60);
  const targetRemainingMinutes = targetRemainingMinutesTotal % 60;
  const targetFormattedDuration =
    targetRemainingKm === 0
      ? "0m"
      : `${targetRemainingHours > 0 ? targetRemainingHours + "h " : ""}${targetRemainingMinutes}m`;

  const remainingMinutesTotal = Math.round((effectiveRemainingKm / 65) * 60);
  const remainingHours = Math.floor(remainingMinutesTotal / 60);
  const remainingMinutes = remainingMinutesTotal % 60;
  const formattedDurationTotal =
    effectiveRemainingKm === 0
      ? "0m"
      : `${remainingHours > 0 ? remainingHours + "h " : ""}${remainingMinutes}m`;

  const eta = appointment?.estimatedArrival || "16:05";
  const arrivalDate = appointment?.arrivalDate
    ? formatDisplayDate(appointment.arrivalDate)
    : appointment?.date
    ? formatDisplayDate(appointment.date)
    : "Hoje";

  const targetEta = isNextTargetDest ? eta : stops[activeStopIndex].time || "--:--";
  const targetDate = isNextTargetDest ? arrivalDate : (stops[activeStopIndex].date ? formatDisplayDate(stops[activeStopIndex].date) : "Hoje");

  // ── Link para abrir a rota no Google Maps (app nativo no celular, web no desktop) ──
  const googleMapsUrl = useMemo(() => {
    const origin = userGpsCoords || originCoords;
    if (!origin || !destCoords) return null;

    const originParam = `${origin.lat},${origin.lng}`;
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
  }, [userGpsCoords, originCoords, destCoords, stops]);

  // ── Abre a rota do Google Maps via a ponte do App Inventor (fora do app,   ──
  // ── deixando o Android decidir entre app nativo ou navegador) ou dentro    ──
  // ── da própria tela (sem sair do app, carregando o site do Maps aqui mesmo).──
  // No navegador comum (Chrome/Safari), o <a href> nativo já cuida do 1º caso.──
  // Dentro do App Inventor, o WebView não reconhece "app links" sozinho, então──
  // avisamos o app nativo via window.AppInventor.setWebViewString(url) —      ──
  // do lado do App Inventor, um bloco "WebViewStringChanged" + ActivityStarter
  // (Action = android.intent.action.VIEW) precisa pegar esse valor e abrir.  ──
  const openOutsideApp = (url: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const w = window as any;
    if (w.AppInventor && typeof w.AppInventor.setWebViewString === "function") {
      e.preventDefault();
      w.AppInventor.setWebViewString(url);
    }
    // fora do App Inventor, deixa o comportamento padrão do <a href> acontecer
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div id="active-route" className="relative h-full bg-slate-950 flex flex-col justify-between font-sans overflow-hidden">

      {/* Full Map Background */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          routeMode="active"
          activeStopIndex={activeStopIndex}
          originCoords={originCoords}
          destCoords={destCoords}
          progress={progress}
          userGpsCoords={userGpsCoords}
          showZoomControls={false}
          showGpsIndicator={false}
          stops={stops}
          alerts={alerts}
          onRouteReady={handleRouteReady}
        />
      </div>

      {/* 1. Floating Top Navigation Instructions Card */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 pointer-events-none">

        {/* Back button + Google Maps link */}
        <div className="flex justify-between items-center w-full pointer-events-auto">
          <button
            onClick={() => onNavigate(ScreenId.RouteOverview)}
            className="bg-slate-900/95 border border-slate-800 text-white p-3 rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition backdrop-blur-md flex items-center justify-center"
            title="Voltar para visão geral"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={openOutsideApp(googleMapsUrl)}
              className="bg-slate-900/95 border border-slate-800 text-white font-extrabold text-[10px] tracking-widest uppercase py-3 px-4 rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition backdrop-blur-md flex items-center gap-1.5"
              title="Ver rota no Google Maps"
            >
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              GOOGLE MAPS
            </a>
          )}
        </div>

        {/* Dynamic Navigation Banner */}
        <div
          className={`pointer-events-auto w-full border p-4 rounded-2xl shadow-2xl flex items-center gap-3.5 backdrop-blur-md transition-all duration-500 ${alertStyle.banner}`}
        >
          {/* Maneuver icon */}
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 shadow-inner shrink-0">
            <ManeuverIcon
              step={isArrived ? null : nextStep}
              className={`w-6 h-6 ${alertStyle.icon}`}
            />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                Navegação ativa
              </p>
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${alertStyle.badge}`}
              >
                {getBadgeLabel()}
              </span>
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wide mt-1 truncate">
              {getBannerInstruction()}
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium mt-0.5 truncate">
              {getBannerSubtext()}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Floating Bottom Dashboard */}
      <div className="absolute bottom-6 left-4 right-4 z-10 space-y-3 pointer-events-none">

        {/* Next Stop banner */}
        <div className="pointer-events-auto bg-slate-900/95 border border-slate-850 p-4 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="bg-blue-950 text-blue-400 p-2.5 rounded-xl border border-blue-900/60 animate-pulse">
            <Navigation className="w-4 h-4 rotate-45 fill-blue-400 stroke-none" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                A SEGUIR NO SEU TRAJETO
              </p>
              {activeStopIndex < 3 && (
                <span className="text-[8px] font-black text-orange-400 bg-orange-950/40 border border-orange-900/30 px-2 py-0.5 rounded-full uppercase">
                  Recomendado
                </span>
              )}
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mt-0.5 truncate">
              {getNextStopTitle()}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{getNextStopDesc()}</p>
          </div>
        </div>

        {/* Trip Stats */}
        <div className="pointer-events-auto bg-white p-5 rounded-3xl shadow-2xl border border-slate-100 grid grid-cols-2 gap-4 relative">

          {/* Left: Remaining Distance */}
          <div className="space-y-1">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate" title={targetTitle}>
              FALTA PARA: {targetTitle}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-950 tracking-tight">
                {targetRemainingKm}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">KM</span>
            </div>
            <div className="text-[10px] space-y-0.5 font-bold mt-1 pt-1 border-t border-slate-100">
              {!isNextTargetDest && (
                <p className="text-slate-500 pb-1">
                  Falta Destino: <span className="text-slate-800">{effectiveRemainingKm} KM</span>
                </p>
              )}
              <p className="text-blue-900 flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${isUsingRealGps ? "bg-blue-600 animate-ping" : "bg-slate-400"}`} />
                {isUsingRealGps ? "GPS Ativo" : "Buscando GPS..."}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="absolute left-1/2 top-6 bottom-6 w-[1px] bg-slate-100" />

          {/* Right: ETA */}
          <div className="space-y-1 pl-4">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
              TEMPO ESTIMADO
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-950 tracking-tight">
                {targetFormattedDuration.split(" ")[0]}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                {targetFormattedDuration.split(" ")[1] || ""}
              </span>
            </div>
            <div className="text-[10px] space-y-0.5 font-bold mt-1 pt-1 border-t border-slate-100">
              <p className="text-slate-500">
                Chegada: <span className="text-slate-800">{targetEta}</span> <span className="text-[9px] text-slate-400 font-normal">({targetDate})</span>
              </p>
              {!isNextTargetDest && (
                <p className="text-slate-500 pt-0.5">
                  Destino: <span className="text-slate-800">{eta}</span> <span className="text-[9px] text-slate-400 font-normal">({arrivalDate})</span>
                </p>
              )}
              {isNextTargetDest && (
                <p className="text-emerald-600 flex items-center gap-0.5 pt-0.5">↘ Fluxo Verde no Porto</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
