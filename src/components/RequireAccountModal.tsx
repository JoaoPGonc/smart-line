import React from "react";
import { X } from "lucide-react";

interface Props {
  title?: string;
  message?: string;
  onClose: () => void;
  onCreateAccount: () => void;
}

export default function RequireAccountModal({ title = "Atenção", message = "Crie uma conta para emitir um alerta!", onClose, onCreateAccount }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-4 shadow-2xl relative">
        <button onClick={onClose} className="absolute right-3 top-3 text-slate-500 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>
        <div className="pt-2 pb-1 px-1 text-center">
          <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-600 mb-4">{message}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onCreateAccount} className="bg-blue-950 text-white px-4 py-2 rounded-lg font-bold">Criar Conta</button>
            <button onClick={onClose} className="bg-white border border-slate-200 px-4 py-2 rounded-lg">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
