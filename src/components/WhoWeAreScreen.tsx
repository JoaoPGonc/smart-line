import React from "react";
import { ArrowLeft, Timer, Shield, BarChart3 } from "lucide-react";
import { ScreenId } from "../types";

interface WhoWeAreScreenProps {
  onNavigate: (screen: ScreenId) => void;
  previousScreen?: ScreenId;
}

export default function WhoWeAreScreen({ onNavigate, previousScreen = ScreenId.Login }: WhoWeAreScreenProps) {
  return (
    <div id="who-we-are" className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto font-sans">
      {/* Top Header Navigation */}
      <button
        onClick={() => onNavigate(previousScreen)}
        className="self-start flex items-center gap-2 text-xs font-bold text-blue-950 uppercase tracking-widest mb-6 hover:opacity-80 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        VOLTAR
      </button>

      {/* Title */}
      <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
        Nossa <br />
        <span className="text-blue-900">Missão</span>
      </h2>

      {/* Main Mission Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs mt-4">
        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          Nós, da equipe <strong className="text-blue-900 font-bold">TechNova</strong>, do <strong className="text-slate-800">IFES Campus Serra</strong>, desenvolvemos o <strong className="text-blue-950 font-bold">SmartLine</strong> com o intuito de facilitar a vida do caminhoneiro, que poderá poupar tempo na fila dos portos, e se preparar melhor para elas. O SmartLine te mostra seu trajeto, tempo de espera e principais paradas, de modo que você consiga manutenenciar sua permanência na estrada, e levar ao destino os produtos que movem o Brasil!
        </p>
      </div>

      {/* Strategic Pillars Title */}
      <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mt-6 mb-3">
        Pilares Estratégicos
      </h3>

      {/* Pillars List */}
      <div className="space-y-3 pb-6">
        {/* Pillar 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 shadow-2xs">
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg h-fit">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800">Redução de Filas</h4>
            <p className="text-[11px] text-slate-500 leading-normal mt-1">
              Sincronização inteligente de agendamentos para minimizar o tempo de espera nos pátios de triagem.
            </p>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 shadow-2xs">
          <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-lg h-fit">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800">Bem-estar do Motorista</h4>
            <p className="text-[11px] text-slate-500 leading-normal mt-1">
              Previsibilidade de rotas e janelas de carga, garantindo jornadas de trabalho mais equilibradas e seguras.
            </p>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 shadow-2xs">
          <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-lg h-fit">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-800">Eficiência Orientada a Dados</h4>
            <p className="text-[11px] text-slate-500 leading-normal mt-1">
              Decisões operacionais baseadas em telemetria em tempo real e análise preditiva do fluxo portuário.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
