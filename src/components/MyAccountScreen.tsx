import React, { useState, useEffect } from "react";
import { ScreenId, Appointment } from "../types";
import { formatAddress } from "../formatDateHelper";
import BottomNavigation from "./BottomNavigation";
import { User, Settings, Bell, Moon, Languages, HelpCircle, FileText, LogOut, ChevronRight, Check, History, Edit3, Timer, X } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

interface MyAccountScreenProps {
  onNavigate: (screen: ScreenId) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  appointments?: Appointment[];
  onUpdateAppointmentStatus?: (index: number, status: Appointment["status"]) => void;
}

export default function MyAccountScreen({ onNavigate, isDarkMode, onToggleDarkMode, onLogout, appointments, onUpdateAppointmentStatus }: MyAccountScreenProps) {
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [expandedTripIndex, setExpandedTripIndex] = useState<number | null>(null);

  const [profile, setProfile] = useState<{
    name: string;
    cpf: string;
    plate: string;
    company: string;
    email: string;
    photoURL?: string;
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

  const allAppointments = (appointments || []).map((a, idx) => ({
    originalIndex: idx,
    date: a.date,
    status: a.status,
    origin: a.origin,
    destination: a.destination,
    time: a.time,
    estimatedArrival: a.estimatedArrival
  })).reverse(); // Newest first

  // Active: trips that haven't been finalized yet (confirmed / pending)
  const activeAppointments = allAppointments.filter(a => a.status === "confirmed" || a.status === "pending");
  
  // History: only trips that were actually taken (completed, delayed, canceled)
  const historyAppointments = allAppointments.filter(a => a.status === "completed" || a.status === "delayed" || a.status === "canceled");
  
  const visibleHistory = showAllTrips ? historyAppointments : historyAppointments.slice(0, 3);

  const statusConfig = {
    "confirmed": { label: "AGENDADO", classes: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    "pending": { label: "PENDENTE", classes: "bg-blue-50 text-blue-600 border-blue-100" },
    "completed": { label: "CONCLUÍDO", classes: "bg-slate-100 text-slate-600 border-slate-200" },
    "delayed": { label: "ATRASADO", classes: "bg-amber-50 text-amber-600 border-amber-100" },
    "canceled": { label: "CANCELADO", classes: "bg-red-50 text-red-600 border-red-100" }
  } as const;

  return (
    <div id="my-account" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans justify-between">
      {/* Scrollable account overview */}
      <div className="flex-1 overflow-y-auto pb-12">
        
        {/* Top Header Avatar Banner */}
        <div className="bg-gradient-to-br from-blue-950 to-blue-900 text-white px-6 pt-8 pb-7 rounded-b-3xl shadow-md relative flex justify-between items-start">
 
          <div className="flex items-center gap-4">
            {/* Avatar block */}
            <div className="bg-white/10 p-1 rounded-2xl border border-white/20 relative w-16 h-16 flex items-center justify-center overflow-hidden">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-blue-900 animate-pulse"></span>
            </div>
 
            {/* Profile text */}
            <div>
              <h3 className="text-base font-black tracking-tight">{profile?.name || (auth.currentUser ? "Carregando..." : "Convidado")}</h3>
              <p className="text-[10px] text-blue-200">{profile?.company || "Motorista"}</p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button 
            onClick={() => onNavigate(ScreenId.EditProfile)}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition text-white border border-white/10"
            title="Editar Perfil"
          >
            <Edit3 className="w-5 h-5" />
          </button>
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

          {/* Section: Viagens Ativas */}
          {activeAppointments.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span> VIAGENS ATIVAS
              </h4>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs divide-y divide-slate-50 overflow-hidden">
                {activeAppointments.map((app) => {
                  const config = statusConfig[app.status as keyof typeof statusConfig];
                  return (
                    <div key={app.originalIndex} className="relative">
                      <div
                        className="p-4 space-y-2 hover:bg-slate-50/50 transition duration-150 cursor-pointer"
                        onClick={() => setExpandedTripIndex(expandedTripIndex === app.originalIndex ? null : app.originalIndex)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-400 font-mono">{app.date}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] text-slate-400 font-medium">toque para ações</span>
                            <span className={`text-[8px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase border ${config.classes}`}>
                              {config.label}
                            </span>
                          </div>
                        </div>
                        <h5 className="text-xs font-black text-slate-700 line-clamp-1">
                          {formatAddress(app.origin, "Origem")} → {formatAddress(app.destination, "Destino")}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Saída: {app.time} • Chegada: {app.estimatedArrival || "--"}
                        </p>
                      </div>

                      {/* Expand: finalization actions */}
                      {expandedTripIndex === app.originalIndex && onUpdateAppointmentStatus && (
                        <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          <p className="w-full text-[9px] text-slate-400 font-semibold mb-1">Como foi essa viagem?</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpdateAppointmentStatus(app.originalIndex, "completed"); setExpandedTripIndex(null); }}
                            className="bg-emerald-500 text-white hover:bg-emerald-600 px-3 py-2 rounded-xl text-[9px] font-black transition flex-1 text-center shadow-sm active:scale-95 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Concluída no prazo
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpdateAppointmentStatus(app.originalIndex, "delayed"); setExpandedTripIndex(null); }}
                            className="bg-amber-500 text-white hover:bg-amber-600 px-3 py-2 rounded-xl text-[9px] font-black transition flex-1 text-center shadow-sm active:scale-95 flex items-center justify-center gap-1">
                            <Timer className="w-3 h-3" /> Com atraso
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onUpdateAppointmentStatus(app.originalIndex, "canceled"); setExpandedTripIndex(null); }}
                            className="bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-xl text-[9px] font-black transition w-full text-center border border-red-200 active:scale-95 flex items-center justify-center gap-1">
                            <X className="w-3 h-3" /> Cancelar / Não realizada
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Histórico de Viagens */}
          <div className="space-y-2.5">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
              <History className="w-3 h-3 text-slate-400" /> HISTÓRICO DE VIAGENS
            </h4>

            {historyAppointments.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs divide-y divide-slate-50 overflow-hidden">
                  {visibleHistory.map((app) => {
                    const config = statusConfig[app.status as keyof typeof statusConfig];
                    return (
                      <div key={app.originalIndex} className="p-4 space-y-2 hover:bg-slate-50/50 transition duration-150">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-400 font-mono">{app.date}</span>
                          <span className={`text-[8px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase border ${config.classes}`}>
                            {config.label}
                          </span>
                        </div>
                        <h5 className="text-xs font-black text-slate-700 line-clamp-1">
                          {formatAddress(app.origin, "Origem")} → {formatAddress(app.destination, "Destino")}
                        </h5>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Saída: {app.time} • Chegada: {app.estimatedArrival || "--"}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {historyAppointments.length > 3 && (
                  <button
                    onClick={() => setShowAllTrips(!showAllTrips)}
                    className="w-full text-center py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-widest rounded-xl transition border border-slate-200/50 active:scale-98">
                    {showAllTrips ? "Ocultar Anteriores" : `Ver mais (${historyAppointments.length - 3})`}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs p-5 text-center text-slate-400 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider">Sem viagens no histórico</p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Viagens concluídas, atrasadas ou canceladas aparecerão aqui.
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
