import React, { useState } from "react";
import { ScreenId, Appointment } from "../types";
import MapComponent from "./MapComponent";
import { ArrowLeft, Compass } from "lucide-react";

interface ViewRouteMapScreenProps {
  onNavigate: (screen: ScreenId) => void;
  originCoords?: { lat: number; lng: number; name?: string } | null;
  destCoords?: { lat: number; lng: number; name?: string } | null;
  appointment?: Appointment | null;
}

export default function ViewRouteMapScreen({ onNavigate, originCoords, destCoords, appointment }: ViewRouteMapScreenProps) {
  const [recenterCount, setRecenterCount] = useState(0);

  const getDistance = () => {
    if (!originCoords || !destCoords) return "267 KM";
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
    return `${Math.round(R * c)} KM`;
  };

  const originName = appointment?.origin?.split(",")[0] || "Pedro Canário";
  const destName = appointment?.destination ? (appointment.destination.split("-")[0]?.split(",")[0]?.trim() || appointment.destination) : "Porto de Tubarão";

  return (
    <div id="view-route-map" className="relative h-full bg-slate-950 flex flex-col justify-between font-sans">
      
      {/* Full Map Background */}
      <div className="absolute inset-0 z-0">
        <MapComponent 
          routeMode="static" 
          originCoords={originCoords} 
          destCoords={destCoords} 
          recenterTrigger={recenterCount} 
          showZoomControls={false}
          showGpsIndicator={false}
          stops={appointment?.customStops}
        />
      </div>

      {/* Floating Top Header Overlays */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        {/* Back Button */}
        <button
          onClick={() => onNavigate(ScreenId.ScheduleConfirmed)}
          className="pointer-events-auto bg-slate-900/95 border border-slate-800 text-white font-extrabold text-[10px] tracking-widest uppercase py-2 px-3.5 rounded-xl shadow-lg hover:bg-slate-800 active:scale-95 transition flex items-center gap-1.5 backdrop-blur-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          VOLTAR
        </button>

        {/* Recenter Button */}
        <button
          onClick={() => setRecenterCount((prev) => prev + 1)}
          className="pointer-events-auto bg-blue-900/95 border border-blue-800 text-blue-100 font-extrabold text-[10px] tracking-widest uppercase py-2 px-3.5 rounded-xl shadow-lg hover:bg-blue-850 active:scale-95 transition flex items-center gap-1.5 backdrop-blur-xs"
          title="Centralizar rota na tela"
        >
          <Compass className="w-4 h-4" />
          CENTRALIZAR
        </button>
      </div>

      {/* Floating Bottom Card Overlays */}
      <div className="absolute bottom-6 left-6 right-6 z-10 bg-slate-900/95 border border-slate-800 p-4 rounded-2xl shadow-2xl space-y-3 backdrop-blur-xs">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
          <div className="max-w-[70%]">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ROTA RECOMENDADA</p>
            <h3 className="text-xs font-black text-white truncate">{originName} → {destName}</h3>
          </div>
          <div className="text-right">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black tracking-wider py-0.5 px-1.5 rounded-md uppercase">
              RECOMENDADA
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">DISTÂNCIA TOTAL</p>
            <p className="text-white font-black text-sm">{getDistance()}</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">DURAÇÃO DIRETA</p>
            <p className="text-emerald-400 font-black text-sm">{appointment?.estimatedDuration || "4h 35min"}</p>
          </div>
        </div>

        <div className="pt-1.5">
          <p className="text-[10px] text-slate-400 leading-normal">
            Toque nos pontos de parada azuis no mapa para ver detalhes ou inicie sua viagem.
          </p>
          {/* BOTÃO INICIAR ROTA */}
<button 
  onClick={() => onNavigate(ScreenId.ActiveRoute)} 
  className="w-full flex items-center justify-center gap-2 bg-[#1A254C] hover:bg-[#121A35] text-white py-3 px-4 rounded-lg font-bold text-sm mt-4"
>
  <Navigation2 className="w-4 h-4 fill-white stroke-none rotate-45" /> 
  INICIAR ROTA
</button>
        </div>
      </div>
    </div>
  );
}
