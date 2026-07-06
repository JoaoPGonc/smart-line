import React, { useState } from "react";
import { ScreenId } from "../types";
import { ArrowLeft, Mail, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { auth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

interface ForgotPasswordScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export default function ForgotPasswordScreen({ onNavigate }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor, preencha o campo de e-mail.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSubmitted(true);
    } catch (err: any) {
      console.error("Erro ao resetar senha:", err);
      let errMsg = "Ocorreu um erro ao solicitar a redefinição de senha.";
      if (err.code === "auth/invalid-email") {
        errMsg = "Endereço de e-mail inválido.";
      } else if (err.code === "auth/user-not-found") {
        errMsg = "E-mail não cadastrado em nosso sistema.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="forgot-password" className="flex flex-col justify-between h-full bg-slate-50 p-6 font-sans">
      <div className="space-y-6">
        {/* Header navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate(ScreenId.Login)}
            className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 active:scale-95 transition"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">
            RECUPERAR SENHA
          </h2>
        </div>

        {!submitted ? (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Perdeu suas credenciais?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Digite seu e-mail cadastrado abaixo e enviaremos um código de redefinição para você.
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4 pt-2">
              {error && (
                <div className="bg-red-50 text-red-600 text-xs p-2.5 rounded-lg font-medium border border-red-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                  ENDEREÇO DE E-MAIL
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@transporte.com"
                    className="w-full bg-slate-100 border border-transparent rounded-xl py-3 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-900 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl shadow-md tracking-wider text-xs transition uppercase flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> ENVIANDO...
                  </>
                ) : (
                  "SOLICITAR LINK DE REDEFINIÇÃO"
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-emerald-50/60 p-6 rounded-2xl border border-emerald-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-emerald-950">E-mail de Recuperação Enviado!</h3>
              <p className="text-xs text-emerald-800/80 mt-1.5 leading-relaxed">
                Se o e-mail <strong>{email}</strong> estiver registrado em nossa plataforma, você receberá instruções em instantes.
              </p>
            </div>
            <button
              onClick={() => onNavigate(ScreenId.Login)}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3 px-4 rounded-xl text-xs tracking-wider transition uppercase"
            >
              Voltar ao Login
            </button>
          </div>
        )}
      </div>

      {/* Safety Note */}
      <div className="text-center text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
        Caso precise de ajuda adicional, entre em contato com o suporte da sua transportadora homologada.
      </div>
    </div>
  );
}
