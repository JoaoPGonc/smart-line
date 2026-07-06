import React from "react";
import { ScreenId } from "../types";
import { ArrowLeft, FileText, Check } from "lucide-react";

interface TermsOfUseScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export default function TermsOfUseScreen({ onNavigate }: TermsOfUseScreenProps) {
  return (
    <div id="terms-of-use" className="flex flex-col justify-between h-full bg-slate-50 p-6 font-sans">
      <div className="space-y-5 flex-1 overflow-y-auto pb-6">
        {/* Header navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate(ScreenId.MyAccount)}
            className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            TERMOS DE USO
          </h2>
        </div>

        {/* Content Box */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 text-blue-900">
            <FileText className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">Políticas Regulatórias</span>
          </div>

          <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed overflow-y-auto max-h-[460px] pr-1">
            <p>
              <strong>1. Objeto:</strong> O presente aplicativo visa otimizar os fluxos de chegada e agendamento de cargas no Porto de Tubarão e pátios logísticos credenciados.
            </p>
            <p>
              <strong>2. Compartilhamento de Tráfego:</strong> Ao emitir um Alerta de Tráfego, o usuário se compromete a compartilhar apenas informações verídicas e constatadas na rodovia BR-101 ou adjacências.
            </p>
            <p>
              <strong>3. Geolocalização:</strong> Este aplicativo utiliza sua geolocalização em tempo real para calcular estimativas precisas de tráfego, estimativa de chegada (ETA) e sugerir pontos de apoio adequados.
            </p>
            <p>
              <strong>4. Responsabilidade:</strong> O motorista não deve utilizar ou manipular o aplicativo enquanto estiver ativamente dirigindo o veículo na rodovia. Utilize pontos de apoio para interações complexas.
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-4 pt-2 border-t border-slate-100">
              Última atualização: Março de 2026.
            </p>
          </div>
        </div>
      </div>

      {/* Accept button */}
      <button
        onClick={() => onNavigate(ScreenId.MyAccount)}
        className="w-full bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase"
      >
        <Check className="w-4 h-4" /> COMPREENDIDO E ACEITO
      </button>
    </div>
  );
}
