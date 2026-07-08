import { formatDisplayDate, formatAddress } from "../formatDateHelper";
import React, { useState } from "react";
import { ScreenId, Appointment } from "../types";
import BottomNavigation from "./BottomNavigation";
import { Clock, Hourglass, ArrowRight, CheckCircle2, ShieldAlert, CheckSquare, Square, Navigation2, Check, Landmark, MapPin, RefreshCw, Calendar, ExternalLink } from "lucide-react";
import { getStopsForRoute, parseDurationMinutes, computeStopTime } from "../utils/routeUtils";

interface RouteOverviewScreenProps {
  onNavigate: (screen: ScreenId) => void;
  checkedStops: boolean[];
  onToggleStop: (index: number) => void;
  appointments: Appointment[];
  selectedAppointmentIndex: number | null;
  onSelectAppointmentIndex: (index: number) => void;
  originCoords?: { lat: number; lng: number; name?: string } | null;
  destCoords?: { lat: number; lng: number; name?: string } | null;
}

export default function RouteOverviewScreen({
  onNavigate,
  checkedStops,
  onToggleStop,
  appointments,
  selectedAppointmentIndex,
  onSelectAppointmentIndex,
  originCoords,
  destCoords,
}: RouteOverviewScreenProps) {

  // 1. Pending view when no appointment is booked yet
  if (!appointments || appointments.length === 0) {
    return (
      <div id="route-overview" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans justify-between">
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-900 border border-blue-100 rounded-full flex items-center justify-center shadow-xs">
            <Hourglass className="w-8 h-8 text-blue-900" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Aguardando Agendamento</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Você não possui nenhuma viagem agendada ativa. Agende uma nova viagem para traçar sua rota e visualizar os pontos de apoio.
            </p>
          </div>
          <button
            onClick={() => onNavigate(ScreenId.Schedule)}
            className="w-full max-w-xs bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-black py-3.5 px-4 rounded-xl shadow-md tracking-wider text-xs uppercase transition cursor-pointer"
          >
            Realizar Novo Agendamento
          </button>
        </div>
        <BottomNavigation activeTab="trajeto" onNavigate={onNavigate} />
      </div>
    );
  }

  // Determine active appointment (fallback to index 0 or last in list if selectedIndex is out of bounds)
  const activeIndex = selectedAppointmentIndex !== null && selectedAppointmentIndex < appointments.length
    ? selectedAppointmentIndex
    : appointments.length - 1;

  const appointment = appointments[activeIndex];

  const origin = formatAddress(appointment?.origin, "Ponto de Partida");
  const destination = appointment?.destination
    ? formatAddress(appointment.destination.split("-")[0]?.trim() || appointment.destination, "Porto de Tubarão")
    : "Porto de Tubarão";
  const duration = appointment?.drivingDuration || appointment?.estimatedDuration || "4h 35m";
  const departure = appointment?.time || "11:30";
  const queue = appointment?.portQueueTime || "1h 45m";
  const eta = appointment?.estimatedArrival || "16:05";
  
  const departureDate = appointment?.departureDate ? formatDisplayDate(appointment.departureDate) : (appointment?.date ? formatDisplayDate(appointment.date) : "Hoje");
  const arrivalDate = appointment?.arrivalDate ? formatDisplayDate(appointment.arrivalDate) : (appointment?.date ? formatDisplayDate(appointment.date) : "Hoje");

  const durMins = parseDurationMinutes(duration);
  const stops = appointment?.customStops && appointment.customStops.length > 0
    ? appointment.customStops
    : getStopsForRoute(destination, (percent, index) => computeStopTime(departure, durMins, percent, index));

  // Calculate remaining stops (only up to the number of generated stops)
  const uncheckedCount = stops.filter((_, idx) => !checkedStops[idx]).length;
  const remainingText = uncheckedCount === 0 
    ? "TODAS AS PARADAS FEITAS" 
    : `${uncheckedCount} PARADAS RESTANTES`;

  return (
    <div id="route-overview" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Main content body scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-12">
        
        {/* Title and Appointment Picker Header */}
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="text-[9px] font-black tracking-widest text-blue-900 uppercase">COORDENAÇÃO OPERACIONAL</p>
            <h2 className="text-sm font-black text-blue-950 font-sans tracking-tight truncate uppercase mt-0.5 max-w-[150px]">
              DESTINO: {destination}
            </h2>
          </div>

          <button
            onClick={() => onNavigate(ScreenId.Schedule)}
            className="text-[9px] font-black bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition select-none flex items-center gap-1.5 uppercase cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" /> NOVO AGENDAMENTO
          </button>
        </div>

        {/* 3. Appointment Selection Card for Multiple Bookings */}
        {appointments.length > 1 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
                Escolha a Viagem para Iniciar Rota:
              </label>
            </div>
            <div className="relative">
              <select
                value={activeIndex}
                onChange={(e) => onSelectAppointmentIndex(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 font-extrabold rounded-xl py-3 px-3.5 focus:outline-none focus:border-blue-900 pr-10 appearance-none cursor-pointer"
              >
                {appointments.map((app, idx) => (
                  <option key={idx} value={idx}>
                    Viagem #{idx + 1}: {formatAddress(app.origin, "Origem")} ➔ {formatAddress(app.destination, "Destino")} ({app.time})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Double Stat Row */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex flex-col items-center text-center">
            <Clock className="w-4 h-4 text-blue-900 mb-1" />
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">DURAÇÃO</p>
            <p className="text-[11px] font-black text-slate-800 mt-0.5">{duration}</p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex flex-col items-center text-center">
            <Clock className="w-4 h-4 text-blue-900 mb-1" />
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">SAÍDA</p>
            <p className="text-[11px] font-black text-slate-800 mt-0.5">{departure}</p>
            <p className="text-[9px] font-bold text-slate-500 mt-0.5">{departureDate}</p>
          </div>
        </div>

        {/* Operations Alert Banner */}
        <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <p className="text-xs font-bold text-emerald-950">Fluxo Operacional</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">Trânsito livre na rodovia</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-emerald-950">Previsão Normal</p>
            <p className="text-[9px] text-emerald-600">Pontos de apoio livres</p>
          </div>
        </div>

        {/* Support Stop List Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              PONTOS DE APOIO E ROTA
            </h3>
            <span className="bg-blue-100/70 text-blue-900 text-[8px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase">
              {remainingText}
            </span>
          </div>

          {/* Timeline Wrapper */}
          <div className="relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-200">
            
            {/* Terminal Sul (Departure completed) */}
            <div className="relative pb-6">
              <span className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-slate-400 flex items-center justify-center text-white">
                <Check className="w-2 h-2 stroke-[3]" />
              </span>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-slate-500">{origin}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Partida agendada para {departure}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{departureDate}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PARTIDA</span>
              </div>
            </div>

            {/* Checkable Stops */}
            {stops.map((stop, index) => {
              const isChecked = checkedStops[index];
              return (
                <div key={stop.id} className="relative pb-6">
                  {/* Custom Checkbox circle element on timeline */}
                  <button
                    onClick={() => onToggleStop(index)}
                    className={`absolute -left-[27px] top-1 w-5 h-5 rounded-md flex items-center justify-center border transition ${
                      isChecked
                        ? "bg-emerald-500 border-emerald-500 text-white shadow-xs"
                        : "bg-white border-slate-300 hover:border-blue-900 text-transparent"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>

                  <div className="flex justify-between items-start">
                    <div className="pl-2">
                      <h4 className={`text-xs font-bold transition-all ${isChecked ? "text-slate-800" : "text-slate-400"}`}>
                        {stop.title}
                      </h4>
                      <p className={`text-[10px] mt-0.5 leading-snug transition-all ${isChecked ? "text-slate-500" : "text-slate-400"}`}>{stop.desc}</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className={`text-xs font-black font-mono px-1.5 py-0.5 rounded-md border transition-all ${isChecked ? "text-slate-700 bg-slate-100 border-slate-200/50" : "text-slate-400 bg-slate-50 border-slate-100"}`}>
                        {stop.time}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                        {stop.date ? formatDisplayDate(stop.date) : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Destination Point */}
            <div className="relative">
              <span className="absolute -left-[24px] top-1.5 w-3.5 h-3.5 rounded-full bg-red-600 border border-white"></span>
              <div className="flex justify-between items-start">
                <div className="pl-1">
                  <h4 className="text-xs font-black text-red-700">{destination}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Chegada prevista: {eta}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{arrivalDate}</p>
                </div>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">DESTINO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Route Button */}
        <button
          onClick={() => onNavigate(ScreenId.ActiveRoute)}
          className="w-full bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase cursor-pointer"
        >
          <Navigation2 className="w-4 h-4 fill-white stroke-none rotate-45" /> INICIAR ROTA
        </button>
      </div>

      {/* Bottom Navigation Tabs */}
      <BottomNavigation activeTab="trajeto" onNavigate={onNavigate} />
    </div>
  );
}
