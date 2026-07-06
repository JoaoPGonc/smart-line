import { formatDisplayDate } from "../formatDateHelper";
import React, { useState, useEffect } from "react";
import { ScreenId, Appointment } from "../types";
import MapComponent from "./MapComponent";
import { 
  ArrowLeft, 
  Navigation, 
  Compass, 
  AlertTriangle, 
  Play, 
  Pause, 
  CornerUpRight, 
  ArrowUp, 
  CheckCircle2, 
  Flag 
} from "lucide-react";
import { getStopsForRoute, parseDurationMinutes, computeStopTime } from "../utils/routeUtils";

interface ActiveRouteScreenProps {
  onNavigate: (screen: ScreenId) => void;
  appointment?: Appointment | null;
  originCoords?: { lat: number; lng: number; name?: string } | null;
  destCoords?: { lat: number; lng: number; name?: string } | null;
  checkedStops?: boolean[];
}

export default function ActiveRouteScreen({ 
  onNavigate, 
  appointment, 
  originCoords, 
  destCoords,
  checkedStops = [false, false, false]
}: ActiveRouteScreenProps) {
  const [speed, setSpeed] = useState(0); // Driving speed (real or simulated)
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0.0); // Start at 0% progress along the road
  const [userGpsCoords, setUserGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isUsingRealGps, setIsUsingRealGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Real-time GPS Tracker hook
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocalização não suportada.");
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    };

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, speed: gpsSpeed } = position.coords;
      setUserGpsCoords({ lat: latitude, lng: longitude });
      setIsUsingRealGps(true);
      setGpsError(null);
      
      if (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed > 0) {
        // convert from m/s to km/h
        setSpeed(Math.round(gpsSpeed * 3.6));
      } else {
        setSpeed(0); // Standing still
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("Real-time GPS error, falling back to simulator:", error.message);
      setGpsError(error.message);
      setIsUsingRealGps(false);
    };

    // Watch position in real-time
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, options);

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Manage stationary / fallback state when real-time GPS is inactive or disconnected
  useEffect(() => {
    if (isUsingRealGps) return;
    
    // If they never had active GPS
    if (!userGpsCoords) {
      setProgress(0.0);
      setSpeed(0);
    } else {
      // They disconnected/lost signal in the middle of the route.
      // Keep the last registered coords (stored in userGpsCoords) and set speed to 0
      setSpeed(0);
    }
  }, [isUsingRealGps, userGpsCoords]);

  // Calculate stops based on the current appointment
  const durMins = parseDurationMinutes(appointment?.estimatedDuration || "4h 35m");
  const stops = appointment?.customStops && appointment.customStops.length > 0
    ? appointment.customStops
    : getStopsForRoute(appointment?.destination || "Porto de Tubarão", (percent) => computeStopTime(appointment?.time || "11:30", durMins, percent));

  const nextUncheckedStopIndex = checkedStops.findIndex(c => !c);
  const activeStopIndex = nextUncheckedStopIndex !== -1 && nextUncheckedStopIndex < stops.length ? nextUncheckedStopIndex : stops.length;

  const getNextStopTitle = () => {
    if (activeStopIndex < stops.length) {
      return `Parada ${activeStopIndex + 1}: ${stops[activeStopIndex].title}`;
    }
    return `Destino Final: ${appointment?.destination?.split(",")[0] || "Porto"}`;
  };

  const getNextStopDesc = () => {
    if (activeStopIndex < stops.length) {
      return stops[activeStopIndex].desc;
    }
    return "Sua carga está pronta para descarregar.";
  };

  // Waze Turn-by-Turn GPS Guidance Logic
  const getWazeInstruction = (p: number) => {
    if (p < 0.25) {
      return {
        icon: <ArrowUp className="w-6 h-6 text-emerald-400" />,
        colorClass: "bg-emerald-950/95 border-emerald-800",
        instruction: "Siga pela BR-101 por mais 18 km",
        subtext: "Trânsito livre, pista em ótimas condições de rodagem.",
        nextStop: stops[0]?.title || "Parada 1",
        nextStopIn: "em 18 km"
      };
    } else if (p >= 0.25 && p < 0.28) {
      return {
        icon: <CornerUpRight className="w-6 h-6 text-amber-400 animate-pulse" />,
        colorClass: "bg-amber-950/95 border-amber-800",
        instruction: "Em 500m, vire à direita na Parada",
        subtext: `${stops[0]?.title || "Parada 1"} - Parada obrigatória / recomendada para motoristas.`,
        nextStop: stops[0]?.title || "Parada 1",
        nextStopIn: "em 500m"
      };
    } else if (p >= 0.28 && p < 0.35) {
      return {
        icon: <ArrowUp className="w-6 h-6 text-emerald-400" />,
        colorClass: "bg-emerald-950/95 border-emerald-800",
        instruction: "Retorne à BR-101 sentido Vitória",
        subtext: "Período de descanso concluído. Reta livre à frente.",
        nextStop: stops[1]?.title || "Parada 2",
        nextStopIn: "em 82 km"
      };
    } else if (p >= 0.35 && p < 0.65) {
      return {
        icon: <ArrowUp className="w-6 h-6 text-emerald-400" />,
        colorClass: "bg-emerald-950/95 border-emerald-800",
        instruction: "Mantenha-se na BR-101 por 42 km",
        subtext: `Próxima parada recomendada de segurança: ${stops[1]?.title || "Parada 2"}.`,
        nextStop: stops[1]?.title || "Parada 2",
        nextStopIn: "em 42 km"
      };
    } else if (p >= 0.65 && p < 0.70) {
      return {
        icon: <AlertTriangle className="w-6 h-6 text-amber-500 animate-bounce" />,
        colorClass: "bg-orange-950/95 border-orange-800",
        instruction: "Fiscalização da PRF em 1 km à frente",
        subtext: "Reduza a velocidade para 60 km/h. Verifique os painéis eletrônicos.",
        nextStop: stops[1]?.title || "Parada 2",
        nextStopIn: "em 1 km"
      };
    } else if (p >= 0.70 && p < 0.85) {
      return {
        icon: <ArrowUp className="w-6 h-6 text-emerald-400" />,
        colorClass: "bg-emerald-950/95 border-emerald-800",
        instruction: "Siga em direção à Serra por mais 24 km",
        subtext: "Reta final de aproximação ao complexo portuário.",
        nextStop: stops[2]?.title || "Parada 3",
        nextStopIn: "em 15 km"
      };
    } else if (p >= 0.85 && p < 0.90) {
      return {
        icon: <CornerUpRight className="w-6 h-6 text-blue-400 animate-pulse" />,
        colorClass: "bg-blue-950/95 border-blue-800",
        instruction: "Em 800m, use a faixa da direita",
        subtext: "Entre na Parada do Pátio para triagem prévia obrigatória.",
        nextStop: stops[2]?.title || "Parada 3",
        nextStopIn: "em 800m"
      };
    } else {
      return {
        icon: <Flag className="w-6 h-6 text-red-400 animate-pulse" />,
        colorClass: "bg-red-950/95 border-red-800",
        instruction: "Chegando ao Porto de Tubarão",
        subtext: "Portão de Triagem Automatizada Liberado. Prepare o QR Code.",
        nextStop: "Porto de Tubarão",
        nextStopIn: "Destino"
      };
    }
  };

  const navInfo = getWazeInstruction(progress);

  // Math helper for total distance
  const getDistanceKm = () => {
    if (!originCoords || !destCoords) return 272; // default
    const R = 6371; // km
    const dLat = ((destCoords.lat - originCoords.lat) * Math.PI) / 180;
    const dLon = ((destCoords.lng - originCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((originCoords.lat * Math.PI) / 180) *
        Math.cos((destCoords.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const totalDistance = getDistanceKm();
  const remainingDistance = Math.max(0, Math.round(totalDistance * (1 - progress)));
  
  // Dynamic remaining duration estimation based on remaining distance and average truck speed (65km/h)
  const remainingMinutesTotal = Math.round((remainingDistance / 65) * 60);
  const remainingHours = Math.floor(remainingMinutesTotal / 60);
  const remainingMinutes = remainingMinutesTotal % 60;
  
  const formattedDuration = remainingDistance === 0 
    ? "0m" 
    : `${remainingHours > 0 ? remainingHours + "h " : ""}${remainingMinutes}m`;

  const eta = appointment?.estimatedArrival || "16:05";
  const arrivalDate = appointment?.arrivalDate ? formatDisplayDate(appointment.arrivalDate) : (appointment?.date ? formatDisplayDate(appointment.date) : "Hoje");

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
        />
      </div>

      {/* 1. Waze-Style Floating Top Navigation Instructions Card */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 pointer-events-none">
        
        {/* Top Control Bar */}
        <div className="flex justify-between items-center w-full pointer-events-auto">
          {/* Back Arrow to Route Overview Screen */}
          <button
            onClick={() => onNavigate(ScreenId.RouteOverview)}
            className="bg-slate-900/95 border border-slate-800 text-white p-3 rounded-2xl shadow-xl hover:bg-slate-800 active:scale-95 transition backdrop-blur-md flex items-center justify-center"
            title="Voltar para visão geral"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Dynamic Navigation Banner (Simulating Waze Layout) */}
        <div className={`pointer-events-auto w-full border p-4 rounded-2xl shadow-2xl flex items-center gap-3.5 backdrop-blur-md transition-all duration-500 ${navInfo.colorClass}`}>
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 shadow-inner shrink-0">
            {navInfo.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Navegação ativa</p>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-800/30">
                {navInfo.nextStopIn}
              </span>
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wide mt-1 truncate">
              {navInfo.instruction}
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium mt-0.5 truncate">
              {navInfo.subtext}
            </p>
          </div>
        </div>
      </div>



      {/* 2. Floating Bottom Dashboard Info Card */}
      <div className="absolute bottom-6 left-4 right-4 z-10 space-y-3 pointer-events-none">
        
        {/* Next Stop banner overlay */}
        <div className="pointer-events-auto bg-slate-900/95 border border-slate-850 p-4 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md">
          <div className="bg-blue-950 text-blue-400 p-2.5 rounded-xl border border-blue-900/60 animate-pulse">
            <Navigation className="w-4 h-4 rotate-45 fill-blue-400 stroke-none" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">A SEGUIR NO SEU TRAJETO</p>
              {activeStopIndex < 3 && (
                <span className="text-[8px] font-black text-orange-400 bg-orange-950/40 border border-orange-900/30 px-2 py-0.5 rounded-full uppercase">
                  Recomendado
                </span>
              )}
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mt-0.5 truncate">
              {getNextStopTitle()}
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {getNextStopDesc()}
            </p>
          </div>
        </div>

        {/* Driving Trip Stats Dashboard */}
        <div className="pointer-events-auto bg-white p-5 rounded-3xl shadow-2xl border border-slate-100 grid grid-cols-2 gap-4 relative">
          
          {/* Left Column: Remaining Distance */}
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DISTÂNCIA RESTANTE</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-950 tracking-tight">{remainingDistance}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">KM</span>
            </div>
            <p className="text-[10px] text-blue-900 font-bold flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
              Navegando via GPS
            </p>
          </div>

          {/* Divider line */}
          <div className="absolute left-1/2 top-6 bottom-6 w-[1px] bg-slate-100"></div>

          {/* Right Column: Estimated Duration */}
          <div className="space-y-1 pl-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TEMPO ESTIMADO</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-950 tracking-tight">
                {formattedDuration.split(" ")[0]}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                {formattedDuration.split(" ")[1] || ""}
              </span>
            </div>
            <div className="text-[10px] space-y-0.5 font-bold">
              <p className="text-slate-500">Chegada: {eta}</p>
              <p className="text-[9px] text-slate-400">{arrivalDate}</p>
              <p className="text-emerald-600 flex items-center gap-0.5">
                ↘ Fluxo Verde no Porto
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
