import React, { useState } from "react";
import { ScreenId, Appointment } from "../types";
import BottomNavigation from "./BottomNavigation";
import MapComponent from "./MapComponent";
import { Check, Clock, ShieldAlert, ArrowRight, HelpCircle, TrafficCone, Compass, Edit3 } from "lucide-react";
import { formatDisplayDate, formatAddress } from "../formatDateHelper";
import { reassignStopTimes, parseDurationMinutes, calculateRouteSpanMins } from "../utils/routeUtils";

// Small inline edit input for duration
function EditDurationInput({ initialValue, onSave }: { initialValue: number; onSave: (mins: number) => void }) {
  const [val, setVal] = useState<string>(String(initialValue));
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {editing ? (
        <>
          <input
            type="number"
            min={1}
            step={5}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-20 text-[12px] px-2 py-1 border rounded-md"
          />
          <button
            onClick={() => {
              const n = Number(val);
              if (isNaN(n) || n <= 0) return alert("Insira um valor válido em minutos.");
              onSave(n);
              setEditing(false);
            }}
            className="bg-blue-950 text-white px-3 py-1 rounded-md text-[12px]"
          >Salvar</button>
          <button onClick={() => { setVal(String(initialValue)); setEditing(false); }} className="px-2 py-1 rounded-md border text-[12px]">Cancelar</button>
        </>
      ) : (
        <>
          <div className="text-[12px] text-slate-700 px-3 py-1 rounded-md border bg-slate-50">{val} min</div>
          <button onClick={() => setEditing(true)} className="px-2 py-1 rounded-md border text-[12px] flex items-center gap-1"><Edit3 className="w-3 h-3" />Editar</button>
        </>
      )}
    </div>
  );
}

interface ScheduleConfirmedScreenProps {
  onNavigate: (screen: ScreenId) => void;
  appointment: Appointment | null;
  originCoords?: { lat: number; lng: number; name?: string } | null;
  destCoords?: { lat: number; lng: number; name?: string } | null;
  onUpdateAppointment?: (updated: Appointment) => void;
}

export default function ScheduleConfirmedScreen({ 
  onNavigate, 
  appointment,
  originCoords,
  destCoords
  , onUpdateAppointment
}: ScheduleConfirmedScreenProps) {
  // Use fallbacks and robust string checks if no appointment state exists yet
  const originStr = typeof appointment?.origin === "string" ? appointment.origin : "Posto Carreteiro";
  const destStr = typeof appointment?.destination === "string" ? appointment.destination : "Porto de Tubarão";
  
  const origin = formatAddress(originStr, "Ponto de Partida");
  const destination = formatAddress(destStr.split("-")[0]?.trim() || destStr, "Porto de Tubarão");
  
  const time = typeof appointment?.time === "string" ? appointment.time : "11:30";
  const arrival = typeof appointment?.estimatedArrival === "string" ? appointment.estimatedArrival : "~16:45";
  
  const departureDate = typeof appointment?.departureDate === "string" && appointment.departureDate 
    ? formatDisplayDate(appointment.departureDate) 
    : (typeof appointment?.date === "string" && appointment.date ? formatDisplayDate(appointment.date) : "Hoje");
    
  const arrivalDate = typeof appointment?.arrivalDate === "string" && appointment.arrivalDate 
    ? formatDisplayDate(appointment.arrivalDate) 
    : (typeof appointment?.date === "string" && appointment.date ? formatDisplayDate(appointment.date) : "Hoje");
  
  // Format arrival so it does NOT include the day of arrival, only the time as requested
  const formattedArrival = arrival && typeof arrival === "string" ? arrival.replace("~", "") : arrival;

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

        {/* Aviso de instabilidade de API de terceiros / Fallback */}
        {(appointment?.osrmFailed || appointment?.overpassFailed) && (!appointment?.customStops || appointment.customStops.length === 0) && (
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex gap-3 items-start shadow-xs animate-in fade-in duration-300">
            <span className="text-amber-600 text-lg leading-none mt-0.5">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-0.5">
                {appointment?.osrmFailed ? "Aviso: Mapa Simplificado" : "Aviso: Paradas Estimadas"}
              </h4>
              <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                {appointment?.osrmFailed 
                  ? "O mapa de estradas está instável no momento. Traçamos uma rota direta, mas fique tranquilo: suas paradas, horários de viagem e o agendamento no porto estão 100% garantidos e funcionando normalmente!"
                  : "O buscador de postos está com lentidão. Sugerimos paradas de descanso automáticas seguras ao longo do caminho para manter seu cronograma e segurança em dia!"
                }
              </p>
            </div>
          </div>
        )}

        {/* Departure & Arrival Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs relative">
          <div className="flex flex-col gap-5 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-200">
            
            {/* Origin */}
            <div className="flex justify-between items-start w-full gap-4">
              <div className="relative flex-1">
                <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-blue-900 bg-white"></span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">PARTIDA</p>
                <p className="text-xs font-bold text-slate-700 pr-2 line-clamp-2" title={originStr}>{originStr}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">SAÍDA</p>
                <p className="text-xs font-black text-blue-950">{time}</p>
                <p className="text-[9px] font-bold text-slate-500">{departureDate}</p>
              </div>
            </div>

            {/* Dynamic Stops */}
            {appointment?.customStops?.map((stop, idx) => (
              <div
                key={`stop-${idx}`}
                className="flex justify-between items-start w-full gap-4 rounded-2xl p-3"
              >
                <div className="relative flex-1">
                  <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-orange-500 bg-white"></span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    PARADA {idx + 1}
                  </p>
                  <p className="text-xs font-bold pr-2 line-clamp-2 text-slate-700" title={stop.title}>
                    {stop.title}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">PREVISÃO</p>
                  <p className="text-xs font-black text-blue-950">{stop.time || "--:--"}</p>
                  <p className="text-[9px] font-bold text-slate-500">{stop.date ? formatDisplayDate(stop.date) : departureDate}</p>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <EditDurationInput
                      initialValue={stop.durationMinutes ?? appointment?.driverNeeds?.stopDurationMinutes ?? 30}
                      onSave={(mins: number) => {
                        if (!appointment) return;
                        const updated = { ...appointment } as Appointment;
                        updated.customStops = (updated.customStops || []).map((s, i) => i === idx ? { ...s, durationMinutes: mins } : s);

                        try {
                          const totalDrivingMins = parseDurationMinutes(updated.drivingDuration || updated.estimatedDuration || "0h 0m");

                          // Recompute route span with the updated stop durations
                          const newSpanMins = calculateRouteSpanMins(
                            totalDrivingMins,
                            updated.customStops || [],
                            updated.driverNeeds || { stopIntervalHours: 4, requiresShower: false, requiresMeal: false, requiresSecurity: false, requiresScale: false }
                          );

                          // Derive arrival date/time from the appointment (fallbacks applied)
                          const arrivalDateRaw = appointment?.arrivalDate || appointment?.date || new Date().toISOString().slice(0, 10);
                          const arrivalTimeRaw = (appointment?.estimatedArrival || appointment?.time || "00:00").toString().replace("~", "");
                          const [ay, am, ad] = arrivalDateRaw.split("-");
                          const [ah, amn] = arrivalTimeRaw.split(":").map(Number);
                          const arrivalDateObj = new Date(Number(ay), Number(am) - 1, Number(ad), ah || 0, amn || 0, 0);

                          // Subtract the new route span to get the updated departure
                          arrivalDateObj.setMinutes(arrivalDateObj.getMinutes() - newSpanMins);
                          const depY = arrivalDateObj.getFullYear();
                          const depMo = String(arrivalDateObj.getMonth() + 1).padStart(2, '0');
                          const depD = String(arrivalDateObj.getDate()).padStart(2, '0');
                          const depH = String(arrivalDateObj.getHours()).padStart(2, '0');
                          const depM = String(arrivalDateObj.getMinutes()).padStart(2, '0');

                          updated.time = `${depH}:${depM}`;
                          updated.departureDate = `${depY}-${depMo}-${depD}`;

                          // Reassign exact stop times using the recomputed departure
                          const recomputed = reassignStopTimes(updated.time, totalDrivingMins, updated.customStops || [], updated.driverNeeds || { stopIntervalHours: 4, requiresShower: false, requiresMeal: false, requiresSecurity: false, requiresScale: false });
                          updated.customStops = recomputed.map((s, i) => ({ ...s, durationMinutes: updated.customStops?.[i]?.durationMinutes }));

                          if (onUpdateAppointment) onUpdateAppointment(updated);
                        } catch (e) {
                          console.error("Recompute departure and stop times failed", e);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Destination */}
            <div className="flex justify-between items-start w-full gap-4">
              <div className="relative flex-1">
                <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-red-500 bg-white"></span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">DESTINO</p>
                <p className="text-xs font-bold text-slate-700 pr-2 line-clamp-2" title={destStr}>{destStr}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CHEGADA</p>
                <p className="text-xs font-black text-blue-950">{formattedArrival}</p>
                <p className="text-[9px] font-bold text-slate-500">{arrivalDate}</p>
              </div>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {/* Mini Preview Map Card */}
          <div className="rounded-2xl border border-slate-100 shadow-xs overflow-hidden h-40 relative bg-slate-900">
            <MapComponent routeMode="static" originCoords={originCoords} destCoords={destCoords} stops={appointment?.customStops} />
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
