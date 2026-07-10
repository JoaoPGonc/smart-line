import React, { useState } from "react";
import { Anchor, ShieldCheck, ChevronRight, User, RefreshCw, AlertCircle, Mail, Lock } from "lucide-react";
import { ScreenId } from "../types";
import { auth } from "../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

interface LoginScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onLoginDemo: () => void;
}

export default function LoginScreen({ onNavigate, onLoginDemo }: LoginScreenProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const validateEmail = (value: string) => {
    return /\S+@\S+\.\S+/.test(value);
  };

  const handleEmailLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, informe e-mail e senha para entrar.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Por favor, informe um e-mail válido.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      localStorage.setItem("smartline_logged_in", "true");
      onNavigate(ScreenId.RouteOverview);
    } catch (err: any) {
      console.error("Erro no login por e-mail:", err);
      let msg = "Falha no login. Verifique suas credenciais.";
      if (err.code === "auth/user-not-found") msg = "Usuário não encontrado. Verifique o e-mail ou crie uma conta.";
      else if (err.code === "auth/wrong-password") msg = "Senha incorreta. Tente novamente.";
      else if (err.code === "auth/invalid-email") msg = "Formato de e-mail inválido.";
      else if (err.code === "auth/too-many-requests") msg = "Muitas tentativas de login. Tente mais tarde.";
      setError(msg + (err.message ? ` (${err.message})` : ""));
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

          {/* Email / Password Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-1">E-MAIL</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@transporte.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-1">SENHA</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-950 hover:bg-blue-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin inline-block" /> : "Entrar"}
              </button>

              <button
                type="button"
                onClick={() => onNavigate(ScreenId.ForgotPassword)}
                className="text-[11px] text-slate-500 hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
          </form>


          {/* Create Account Link */}
          <div className="text-center pt-2 pb-1 border-b border-slate-100">
            <button
              onClick={() => onNavigate(ScreenId.Register)}
              className="text-[11px] font-bold text-blue-950 hover:underline"
            >
              Criar Conta
            </button>
          </div>

          {/* Access Offline Mode */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onLoginDemo}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase cursor-pointer"
            >
              Entrar como Convidado
            </button>
          </div>
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
