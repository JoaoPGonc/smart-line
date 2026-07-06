import React, { useState, useEffect } from "react";
import { ScreenId, Appointment } from "../types";
import BottomNavigation from "./BottomNavigation";
import { User, Settings, Bell, Moon, Languages, HelpCircle, FileText, LogOut, ChevronRight, Check, History } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

interface MyAccountScreenProps {
  onNavigate: (screen: ScreenId) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  appointments?: Appointment[];
}

export default function MyAccountScreen({ onNavigate, isDarkMode, onToggleDarkMode, onLogout, appointments }: MyAccountScreenProps) {
  const [profile, setProfile] = useState<{
    name: string;
    cpf: string;
    plate: string;
    company: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      getDoc(doc(db, "users", currentUser.uid))
        .then((snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as any);
          } else {
            setProfile({
              name: currentUser.displayName || "Motorista",
              email: currentUser.email || "",
              cpf: "Não cadastrado",
              plate: "Não cadastrado",
              company: "Não cadastrado",
            });
          }
        })
        .catch((e) => {
          console.error("Error fetching profile:", e);
          handleFirestoreError(e, OperationType.GET, `users/${currentUser.uid}`);
        });
    } else {
      const isDemo = localStorage.getItem("is_demo") === "true";
      if (isDemo) {
        setProfile({
          name: "Caminhoneiro Convidado",
          email: "convidado@smartline.com.br",
          cpf: "123.456.789-00",
          plate: "ABC-1234",
          company: "Transportadora Demo S/A",
        });
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout error", e);
    }
    onLogout();
  };

  return (
    <div id="my-account" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans justify-between">
      {/* Scrollable account overview */}
      <div className="flex-1 overflow-y-auto pb-12">
        
        {/* Top Header Avatar Banner */}
        <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white px-6 pt-8 pb-7 rounded-b-3xl shadow-md relative">
 
          <div className="flex items-center gap-4">
            {/* Avatar block */}
            <div className="bg-white/10 p-3 rounded-2xl border border-white/20 relative">
              <User className="w-10 h-10 text-white" />
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-blue-900 animate-pulse"></span>
            </div>
 
            {/* Profile text */}
            <div>
              <h3 className="text-base font-black tracking-tight">{profile?.name || "Carregando..."}</h3>
            </div>
          </div>
        </div>

        {/* Configurations List */}
        <div className="p-6 space-y-5">
          {/* Section 1 */}
          <div className="space-y-2.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
              CONFIGURAÇÕES DO APP
            </h4>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs overflow-hidden">
              {/* Row 2: Dark Mode */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 text-blue-900 p-1.5 rounded-lg">
                    <Moon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Modo Escuro</span>
                </div>
                {/* Switch Toggle */}
                <button
                  onClick={onToggleDarkMode}
                  className={`w-10 h-6 rounded-full p-1 transition-all duration-300 relative ${
                    isDarkMode ? "bg-blue-900" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 absolute top-1 ${
                      isDarkMode ? "right-1" : "left-1"
                    }`}
                  ></div>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Histórico de Viagens */}
          <div className="space-y-2.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <History className="w-3 h-3 text-slate-400" /> HISTÓRICO DE VIAGENS
            </h4>

            {appointments && appointments.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs divide-y divide-slate-50 overflow-hidden">
                {appointments.map((app, idx) => (
                  <div key={idx} className="p-4 space-y-2 hover:bg-slate-50/50 transition duration-150">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 font-mono">{app.date}</span>
                      <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase border border-emerald-100">
                        {app.status === "confirmed" ? "Agendado" : "Pendente"}
                      </span>
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-700">
                        {app.origin?.split(",")[0]} → {app.destination?.split(",")[0] || app.destination}
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Horário: {app.time} • Chegada Estimada: {app.estimatedArrival || "--"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs p-6 text-center text-slate-400 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider">Sem histórico de viagens</p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  As informações de suas viagens agendadas aparecerão aqui assim que realizar um agendamento.
                </p>
              </div>
            )}
          </div>

          {/* Section 2 */}
          <div className="space-y-2.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
              SUPORTE
            </h4>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs divide-y divide-slate-50 overflow-hidden">
              {/* Support 1: Quem Somos */}
              <button
                onClick={() => onNavigate(ScreenId.WhoWeAre)}
                className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 text-blue-900 p-1.5 rounded-lg">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Quem Somos?</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Support 2: Termos de Uso */}
              <button
                onClick={() => onNavigate(ScreenId.TermsOfUse)}
                className="w-full text-left p-3.5 flex items-center justify-between hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-50 text-blue-900 p-1.5 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Termos de Uso</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Sair da conta (Logout button) */}
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 hover:bg-red-100 active:scale-98 text-red-700 font-black py-3.5 px-4 rounded-2xl border border-red-100/50 shadow-3xs flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase"
          >
            <LogOut className="w-4.5 h-4.5" /> Sair da Conta
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <BottomNavigation activeTab="conta" onNavigate={onNavigate} />
    </div>
  );
}
