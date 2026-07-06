import React from "react";
import { ScreenId } from "../types";
import BottomNavigation from "./BottomNavigation";
import { CheckCircle2, Heart, ArrowLeft } from "lucide-react";

interface AlertSuccessScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export default function AlertSuccessScreen({ onNavigate }: AlertSuccessScreenProps) {
  return (
    <div id="alert-success" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans justify-between">
      {/* Scrollable container */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center items-center text-center space-y-5">
        
        {/* Animated Check Circle */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-45 scale-125"></div>
          <div className="bg-emerald-50 text-emerald-600 p-6 rounded-full border border-emerald-100 shadow-md relative z-10">
            <CheckCircle2 className="w-16 h-16 stroke-[1.8]" />
          </div>
        </div>

        {/* Success Messages */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Alerta Enviado com Sucesso!
          </h2>
          <p className="text-xs text-slate-400 font-normal max-w-xs mx-auto leading-relaxed">
            Obrigado por ajudar a manter o aplicativo atualizado para outros caminhoneiros na estrada.
          </p>
        </div>

        {/* Hearts contribution tag */}
        <div className="bg-emerald-50 text-emerald-800 text-[10px] font-bold tracking-wider px-3.5 py-1.5 rounded-full uppercase flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 fill-emerald-600 stroke-none" />
          Comunidade Segura
        </div>

        {/* Back Button */}
        <div className="w-full pt-4">
          <button
            onClick={() => onNavigate(ScreenId.EmitAlert)}
            className="w-full max-w-xs mx-auto bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-md tracking-wider text-xs transition uppercase flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> VOLTAR
          </button>
        </div>
      </div>

      {/* Tab bar Navigation */}
      <BottomNavigation activeTab="transito" onNavigate={onNavigate} />
    </div>
  );
}
