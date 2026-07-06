import React, { useState } from "react";
import { ScreenId, TrafficAlert } from "../types";
import BottomNavigation from "./BottomNavigation";
import { 
  AlertTriangle, 
  Hammer, 
  CheckSquare, 
  ChevronRight, 
  User, 
  ArrowLeft,
  MapPin,
  Clock,
  Car
} from "lucide-react";

interface TransitCenterScreenProps {
  onNavigate: (screen: ScreenId) => void;
  alerts: TrafficAlert[];
}

export default function TransitCenterScreen({ onNavigate, alerts }: TransitCenterScreenProps) {
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  return (
    <div id="transit-center" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans relative">
      
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-12">
        
        {/* Header greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Olá, João Silva
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Confira o status operacional agora.
            </p>
          </div>
          <div className="bg-blue-900 text-white p-2 rounded-xl shrink-0">
            <User className="w-5 h-5" />
          </div>
        </div>

        {/* Operational Stats Cards */}
        <div className="space-y-3">
          {/* Stat 1: Download wait time */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
              TEMPO MÉDIO DE DESCARGA
            </p>
            <div className="flex justify-between items-baseline">
              <h3 className="text-2xl font-black text-blue-950 tracking-tight">
                1h45 <span className="text-xs font-bold text-slate-400 uppercase">minutos</span>
              </h3>
              <span className="bg-emerald-50 text-emerald-600 text-[9px] font-extrabold tracking-wider px-2 py-1 rounded-full uppercase">
                ↘ 12% menor que ontem
              </span>
            </div>
          </div>

          {/* Stat 2: Port occupation progress bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-3">
            <div className="flex justify-between items-baseline">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  OCUPAÇÃO DO PÁTIO
                </p>
                <h3 className="text-xl font-black text-blue-950 tracking-tight mt-1">
                  186 <span className="text-xs font-bold text-slate-400 uppercase">de 250 vagas</span>
                </h3>
              </div>
              <span className="bg-orange-50 text-orange-600 text-[9px] font-extrabold tracking-wider px-2.5 py-1 rounded-full uppercase">
                MODERADO
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-950 h-full rounded-full" style={{ width: "74%" }}></div>
              </div>
              <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                <span>74% CAPACIDADE</span>
                <span className="text-orange-500">MODERADO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Alerts & Blocks */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              ALERTAS DE CAMINHONEIROS
            </h3>
            <button 
              onClick={() => setShowAllAlerts(true)}
              className="text-[10px] font-black text-blue-900 uppercase tracking-wider hover:underline"
            >
              VER TODOS
            </button>
          </div>

          {/* Alerts Timeline List */}
          <div className="space-y-2.5">
            {alerts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 space-y-2">
                <div className="text-2xl">🚨</div>
                <p className="text-xs font-bold uppercase tracking-wider">Sem alertas no momento</p>
                <p className="text-[10px] text-slate-400">Nenhum caminhoneiro submeteu alertas ou bloqueios na via até agora.</p>
              </div>
            ) : (
              // Display first 3 alerts on main view, click Ver Todos to see all
              alerts.slice(0, 3).map((alert) => {
                let IconComponent = AlertTriangle;
                let borderClass = "border-l-4 border-l-red-500";

                if (alert.type === "maintenance" || alert.type === "other") {
                  IconComponent = Hammer;
                  borderClass = "border-l-4 border-l-orange-500";
                } else if (alert.type === "blocked") {
                  IconComponent = CheckSquare;
                  borderClass = "border-l-4 border-l-blue-500";
                }

                return (
                  <div
                    key={alert.id}
                    className={`bg-white p-4 rounded-xl border border-slate-100 ${borderClass} shadow-3xs flex gap-3.5 items-start`}
                  >
                    <div className="p-2 rounded-lg bg-slate-50 text-slate-700 shrink-0">
                      <IconComponent className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="text-xs font-black text-slate-800 tracking-tight leading-tight uppercase truncate">
                          {alert.title}
                        </h4>
                        <span className="text-[8px] font-extrabold text-slate-400 font-mono tracking-wider shrink-0 uppercase">
                          {alert.timeAgo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal font-normal">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-1 text-[9px] font-extrabold text-slate-400 uppercase mt-1 pt-1 border-t border-slate-50">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{alert.location}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Emit traffic alert button */}
        <button
          onClick={() => onNavigate(ScreenId.EmitAlert)}
          className="w-full bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase"
        >
          <AlertTriangle className="w-4 h-4 text-orange-400 fill-orange-400 stroke-blue-950 stroke-[1.5]" />
          EMITIR ALERTA DE TRÁFEGO
        </button>
      </div>

      {/* FULL ALERTS OVERLAY (VER TODOS PAGE) */}
      {showAllAlerts && (
        <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setShowAllAlerts(false)}
              className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-black text-slate-900">Alertas da Comunidade</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Todos os avisos e bloqueios ativos enviados por motoristas.</p>
            </div>
          </div>

          {/* List of alerts */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            {alerts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 space-y-3.5">
                <div className="text-4xl">🚨</div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Nenhum bloqueio ou alerta</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Tudo limpo na rodovia! Não há nenhum registro de interdição ou lentidão submetido pelos motoristas no sistema.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                let IconComponent = AlertTriangle;
                let borderClass = "border-l-4 border-l-red-500";

                if (alert.type === "maintenance" || alert.type === "other") {
                  IconComponent = Hammer;
                  borderClass = "border-l-4 border-l-orange-500";
                } else if (alert.type === "blocked") {
                  IconComponent = CheckSquare;
                  borderClass = "border-l-4 border-l-blue-500";
                }

                return (
                  <div
                    key={`all-${alert.id}`}
                    className={`bg-white p-4.5 rounded-2xl border border-slate-100 ${borderClass} shadow-2xs flex gap-4 items-start`}
                  >
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-700 shrink-0">
                      <IconComponent className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="text-xs font-black text-slate-800 tracking-tight leading-tight uppercase truncate">
                          {alert.title}
                        </h4>
                        <span className="text-[8px] font-extrabold text-slate-400 font-mono tracking-wider shrink-0 uppercase">
                          {alert.timeAgo}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal font-normal">
                        {alert.description}
                      </p>
                      
                      <div className="bg-slate-50 p-2 rounded-lg flex items-center gap-1.5 text-[9px] font-extrabold text-slate-600 uppercase mt-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                        <span className="truncate text-slate-600">{alert.location}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer close button */}
          <div className="bg-white border-t border-slate-100 p-4 shrink-0">
            <button
              onClick={() => setShowAllAlerts(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition uppercase tracking-wider"
            >
              Voltar ao Trânsito
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="transito" onNavigate={onNavigate} />
    </div>
  );
}
