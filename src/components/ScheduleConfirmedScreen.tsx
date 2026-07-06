import React from "react";
import { ScreenId, Appointment } from "../types";
import BottomNavigation from "./BottomNavigation";
import MapComponent from "./MapComponent";
import { Check, Clock, ShieldAlert, ArrowRight, HelpCircle, TrafficCone, Compass } from "lucide-react";
import { formatDisplayDate } from "../formatDateHelper";

interface ScheduleConfirmedScreenProps {
  onNavigate: (screen: ScreenId) => void;
  appointment: Appointment | null;
  originCoords?: { lat: number; lng: number; name?: string } | null;
  destCoords?: { lat: number; lng: number; name?: string } | null;
}

export default function ScheduleConfirmedScreen({ 
  onNavigate, 
  appointment,
  originCoords,
  destCoords
}: ScheduleConfirmedScreenProps) {
  // Use fallbacks if no appointment state exists yet
  const origin = appointment?.origin?.split(",")[0] || "Posto Carreteiro";
  const destination = appointment?.destination ? (appointment.destination.split("-")[0]?.trim() || appointment.destination) : "Porto de Tubarão";
  const time = appointment?.time || "11:30";
  const arrival = appointment?.estimatedArrival || "~16:45";
  
  const departureDate = appointment?.departureDate ? formatDisplayDate(appointment.departureDate) : (appointment?.date ? formatDisplayDate(appointment.date) : "Hoje");
  const arrivalDate = appointment?.arrivalDate ? formatDisplayDate(appointment.arrivalDate) : (appointment?.date ? formatDisplayDate(appointment.date) : "Hoje");
  
  // Format arrival so it does NOT include the day of arrival, only the time as requested
  const formattedArrival = arrival.replace("~", "");

  return (
    <div id="schedule-confirmed-screen" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-12">
        
        {/* Top Checkmark Circle */}
        <div className="flex flex-col items-center text-center mt-3 mb-2">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-900 shadow-sm animate-bounce">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <h2 className="text-sm font-black text-slate-800 tracking-wider uppercase mt-3">
            AGENDAMENTO CONFIRMADO
          </h2>
        </div>

        {/* Departure & Arrival Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs relative">
          <div className="flex justify-between items-start">
            {/* Timeline track */}
            <div className="flex flex-col gap-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-200">
              {/* Origin */}
              <div className="relative">
                <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-blue-900 bg-white"></span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">PARTIDA</p>
                <p className="text-xs font-bold text-slate-700">{origin}</p>
              </div>

              {/* Destination */}
              <div className="relative">
                <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-red-500 bg-white"></span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">DESTINO</p>
                <p className="text-xs font-bold text-slate-700">{destination}</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="text-right space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">SAÍDA</p>
                <p className="text-xs font-black text-blue-950">{time}</p>
                <p className="text-[9px] font-bold text-slate-500">{departureDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CHEGADA</p>
                <p className="text-xs font-black text-blue-950">{formattedArrival}</p>
                <p className="text-[9px] font-bold text-slate-500">{arrivalDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Rows */}
        <div className="grid grid-cols-1 gap-2.5">
          {/* Mini Preview Map Card */}
          <div className="rounded-2xl border border-slate-100 shadow-xs overflow-hidden h-40 relative bg-slate-900">
            <MapComponent routeMode="static" originCoords={originCoords} destCoords={destCoords} />
          </div>

          {/* Action Button */}
          <button
            onClick={() => onNavigate(ScreenId.ViewRouteMap)}
            className="w-full bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase"
          >
            VER MEU TRAJETO <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Reusable Tab Navigation Bar */}
      <BottomNavigation activeTab="agendar" onNavigate={onNavigate} />
    </div>
  );
}
