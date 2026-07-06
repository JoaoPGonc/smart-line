import React, { useState } from "react";
import { Anchor, ShieldCheck, ChevronRight, User, RefreshCw, AlertCircle } from "lucide-react";
import { ScreenId } from "../types";
import { auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

interface LoginScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onLoginDemo: () => void;
}

export default function LoginScreen({ onNavigate, onLoginDemo }: LoginScreenProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onNavigate(ScreenId.Schedule);
    } catch (err: any) {
      console.error("Erro no login com Google:", err);
      if (err.code === "auth/operation-not-allowed") {
        setError("O login com Google não está ativado no Firebase. Você pode entrar usando o 'Acesso de Teste (Offline)' abaixo.");
      } else {
        setError("Erro ao entrar com Google: " + (err.message || err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-screen" className="flex flex-col justify-between h-full bg-slate-50 p-6 font-sans">
      {/* Top Header Logo */}
      <div className="flex flex-col items-center text-center mt-8">
        <div className="bg-blue-950 p-3.5 rounded-full text-white shadow-lg mb-3">
          <Anchor className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold tracking-wider text-blue-950 font-sans">
          SMART LINE
        </h1>
        <p className="text-[10px] tracking-widest text-slate-400 font-semibold mt-1 uppercase">
          SISTEMA DE GESTÃO DE ROTAS E PORTOS
        </p>
      </div>

      {/* Main Login Card */}
      <div className="my-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 text-center">Acesso ao Sistema</h2>
        <p className="text-xs text-slate-400 mt-1 text-center">
          Conecte-se para acessar o painel de rotas e agendamento.
        </p>

        <div className="mt-8 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg font-medium border border-red-100">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-blue-950 hover:bg-blue-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2.5 tracking-wider text-xs transition uppercase disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            )}
            Entrar com o Google
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-[9px] text-slate-400 font-bold tracking-widest uppercase">OU</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Demo Offline Access Button */}
          <button
            type="button"
            onClick={onLoginDemo}
            disabled={loading}
            className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Acesso de Teste (Offline)
          </button>
        </div>
      </div>

      {/* Quem Somos Panel Button */}
      <button
        onClick={() => onNavigate(ScreenId.WhoWeAre)}
        className="w-full bg-white hover:bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between shadow-xs transition group mt-6"
      >
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 text-blue-900 p-2 rounded-xl group-hover:scale-110 transition">
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-700">Quem Somos?</span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>

      {/* Footer Branding */}
      <div className="text-center mt-6 text-[9px] text-slate-400 font-mono tracking-widest uppercase">
        V1.0 • TECH NOVA © 2026
      </div>
    </div>
  );
}
