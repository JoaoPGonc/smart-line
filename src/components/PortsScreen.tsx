import React, { useState, useEffect } from "react";
import { ScreenId } from "../types";
import BottomNavigation from "./BottomNavigation";
import { Activity, Clock, TrendingUp, TrendingDown, Minus, ThumbsUp } from "lucide-react";
import { BRAZILIAN_PORTS, fetchRecentReports, submitQueueReport, calculateEstimatedWaitTime, QueueReport, QueueStatus, findClosestPort, fetchPortAppointments, PortAppointment } from "../utils/portQueueService";
import { auth } from "../lib/firebase";

interface PortsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export default function PortsScreen({ onNavigate }: PortsScreenProps) {
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
  
  // States for Caminhoneiros (Truck Queues) Tab
  const [selectedPortId, setSelectedPortId] = useState<string>(BRAZILIAN_PORTS[0].id);
  const [portReports, setPortReports] = useState<QueueReport[]>([]);
  const [portAppointments, setPortAppointments] = useState<PortAppointment[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReportStatus, setSelectedReportStatus] = useState<QueueStatus | null>(null);

  useEffect(() => {
    // Simulate initial connection
    const timer = setTimeout(() => {
      setConnectionStatus("connected");
    }, 1500);

    // Auto-detect closest port
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const closestId = findClosestPort(latitude, longitude);
          setSelectedPortId(closestId);
        },
        (error) => console.log("Geolocation error:", error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    }

    return () => clearTimeout(timer);
  }, []);

  // Fetch reports when port changes
  useEffect(() => {
    async function loadData() {
      setLoadingReports(true);
      const reports = await fetchRecentReports(selectedPortId);
      const appointments = await fetchPortAppointments(selectedPortId);
      
      // Filter out any stale appointments without a valid time or those for the 10th if requested by the user
      const validAppointments = appointments.filter(app => app.time && app.time !== "--:--" && app.time !== "");
      
      setPortReports(reports);
      setPortAppointments(validAppointments);
      setLoadingReports(false);
    }
    loadData();
    // Simulate real-time polling every 60s
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [selectedPortId]);

  const handleReport = async (status: QueueStatus) => {
    if (!auth.currentUser) {
      alert("Você precisa estar logado para reportar o trânsito.");
      return;
    }
    setIsReporting(true);
    const success = await submitQueueReport(selectedPortId, status, auth.currentUser.uid);
    if (success) {
      // Optimistic update
      setPortReports(prev => [{
        portId: selectedPortId,
        status,
        timestamp: new Date().toISOString(),
        reportedByUid: auth.currentUser!.uid
      }, ...prev]);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    }
    setIsReporting(false);
  };

  const currentPort = BRAZILIAN_PORTS.find(p => p.id === selectedPortId)!;
  const currentEstimate = calculateEstimatedWaitTime(currentPort, portReports);

  const getStatusColor = (status: QueueStatus) => {
    switch(status) {
      case "livre": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "moderado": return "text-blue-600 bg-blue-50 border-blue-200";
      case "intenso": return "text-amber-600 bg-amber-50 border-amber-200";
      case "parado": return "text-red-600 bg-red-50 border-red-200";
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative font-sans overflow-hidden justify-between">
      {showSuccess && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm flex flex-col items-center text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border border-emerald-100 shadow-inner">
              <ThumbsUp className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-emerald-950 mb-2 tracking-tight">Relato Enviado!</h2>
            <p className="text-sm text-slate-500 font-medium">
              Sua contribuição ajuda outros motoristas. Obrigado!
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-blue-950 px-6 pt-12 pb-5 sticky top-0 z-20 shadow-md shrink-0">
        <h1 className="text-xl font-black text-white tracking-tight leading-none mb-1">
          Inteligência Portuária
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-blue-200 text-xs font-medium">Dados e previsões em tempo real</p>
          <div className="flex items-center gap-1.5">
            {connectionStatus === "connecting" ? (
              <span className="flex items-center gap-1.5 text-[9px] font-bold bg-white/10 text-white px-2 py-1 rounded-full uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" /> Conectando
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ao Vivo
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 mt-4 pb-6 scrollbar-hide space-y-4">
        {/* Port Selector */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <label className="block text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-1.5">
            Selecione o Porto
          </label>
          <select 
            value={selectedPortId}
            onChange={(e) => setSelectedPortId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-900"
          >
            {BRAZILIAN_PORTS.map(port => (
              <option key={port.id} value={port.id}>{port.name} - {port.state}</option>
            ))}
          </select>
        </div>

        {/* AI Estimation Card */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-950 p-5 rounded-2xl shadow-md text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-24 h-24" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Estimativa de Espera</h3>
                <p className="text-3xl font-black">{currentEstimate.waitTime} <span className="text-base font-bold text-blue-300">min</span></p>
              </div>
              <div className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest flex items-center gap-1 bg-white`}>
                <span className={getStatusColor(currentEstimate.status).split(' ')[0]}>{currentEstimate.label}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-3">
                <span className="block text-[8px] font-bold text-blue-300 uppercase tracking-widest mb-1">Tendência</span>
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  {currentEstimate.trend === "melhorando" && <TrendingDown className="w-4 h-4 text-emerald-400" />}
                  {currentEstimate.trend === "piorando" && <TrendingUp className="w-4 h-4 text-red-400" />}
                  {currentEstimate.trend === "estavel" && <Minus className="w-4 h-4 text-blue-200" />}
                  <span className="capitalize">{currentEstimate.trend}</span>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <span className="block text-[8px] font-bold text-blue-300 uppercase tracking-widest mb-1">Horário de Pico</span>
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{currentPort.peakHours[0]}h - {currentPort.peakHours[currentPort.peakHours.length-1]}h</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Previsão de Espera Panel - Flow chart of appointments for the next week */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Fluxo de Agendamentos Realizados
            </h3>
            <span className="bg-blue-50 text-blue-900 text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full uppercase border border-blue-100">
              ESTATÍSTICAS REAIS
            </span>
          </div>
          {/* Time Stat */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-blue-950 tracking-tight">{portAppointments.length}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Agendamentos Realizados</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Gráfico com base nos dados reais de agendamento dos motoristas integrados na plataforma para este porto.
          </p>
          
          {/* Hourly Flow Graph */}
          <div className="pt-2">
            {(() => {
              const getHourPeriod = (timeStr?: string): number => {
                if (!timeStr || timeStr === "--:--") return -1;
                const hourStr = timeStr.split(":")[0];
                const hour = parseInt(hourStr, 10);
                if (isNaN(hour)) return -1;
                
                if (hour >= 0 && hour < 6) return 0; // Madrugada
                if (hour >= 6 && hour < 12) return 1; // Manhã
                if (hour >= 12 && hour < 18) return 2; // Tarde
                if (hour >= 18 && hour < 24) return 3; // Noite
                return -1;
              };

              const periodCounts = [0, 0, 0, 0];
              portAppointments.forEach((app) => {
                const pIndex = getHourPeriod(app.time);
                if (pIndex >= 0 && pIndex < 4) {
                  periodCounts[pIndex]++;
                }
              });

              const maxCount = Math.max(...periodCounts, 1);
              const periods = [
                { label: "Madrugada", count: periodCounts[0] },
                { label: "Manhã", count: periodCounts[1] },
                { label: "Tarde", count: periodCounts[2] },
                { label: "Noite", count: periodCounts[3] },
              ];

              return (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Fluxo de Carros por Período
                    </h4>
                    <div className="flex items-end justify-between h-20 px-2 border-b border-slate-100 gap-2">
                      {periods.map((item, idx) => {
                        const percentage = (item.count / maxCount) * 100;
                        const visualHeight = item.count > 0 ? `${percentage}%` : "6%";
                        return (
                          <div key={idx} className="flex flex-col items-center flex-1 group">
                            <div className="text-[8px] font-black text-slate-500 mb-1 font-mono">
                              {item.count}
                            </div>
                            <div
                              style={{ height: visualHeight }}
                              className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                                item.count > 0
                                  ? "bg-blue-900 shadow-sm shadow-blue-900/10"
                                  : "bg-slate-150"
                              }`}
                            ></div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Graph Labels */}
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 tracking-wider pt-2 px-1">
                      {periods.map((item, idx) => (
                        <span key={idx} className="flex-1 text-center font-bold">
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {portAppointments.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Detalhes dos Agendamentos
                      </h4>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                        {portAppointments.map((app, idx) => {
                          const dateParts = app.date.includes("-") ? app.date.split("-") : app.date.split("/");
                          const formattedDate = dateParts.length === 3 
                            ? (app.date.includes("-") ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : app.date)
                            : app.date;
                            
                          return (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="bg-blue-100 p-1.5 rounded text-blue-900">
                                  <Clock className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-600">{formattedDate}</p>
                                  <p className="text-[9px] font-medium text-slate-400 uppercase">
                                    Previsão de Chegada
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-black text-blue-950">{app.time || "--:--"}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Collaborative Reporting */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <ThumbsUp className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Reportar Filas nos Arredores</h3>
              <p className="text-[10px] text-slate-500">Ajude outros motoristas informando o tamanho das filas nos acessos do porto.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button 
              disabled={isReporting}
              onClick={() => setSelectedReportStatus("livre")}
              className={`border text-[10px] font-black uppercase py-2.5 rounded-xl transition ${selectedReportStatus === "livre" ? "bg-emerald-600 text-white border-emerald-700" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"}`}
            >
              🟢 Livre / Rápido
            </button>
            <button 
              disabled={isReporting}
              onClick={() => setSelectedReportStatus("moderado")}
              className={`border text-[10px] font-black uppercase py-2.5 rounded-xl transition ${selectedReportStatus === "moderado" ? "bg-blue-600 text-white border-blue-700" : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"}`}
            >
              🔵 Fila Moderada
            </button>
            <button 
              disabled={isReporting}
              onClick={() => setSelectedReportStatus("intenso")}
              className={`border text-[10px] font-black uppercase py-2.5 rounded-xl transition ${selectedReportStatus === "intenso" ? "bg-amber-500 text-white border-amber-600" : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"}`}
            >
              🟠 Trânsito Intenso
            </button>
            <button 
              disabled={isReporting}
              onClick={() => setSelectedReportStatus("parado")}
              className={`border text-[10px] font-black uppercase py-2.5 rounded-xl transition ${selectedReportStatus === "parado" ? "bg-red-600 text-white border-red-700" : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"}`}
            >
              🔴 Tudo Parado
            </button>
          </div>

          {selectedReportStatus && (
            <button
              onClick={() => {
                handleReport(selectedReportStatus);
                setSelectedReportStatus(null);
              }}
              disabled={isReporting}
              className="w-full mt-3 bg-blue-950 hover:bg-blue-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 tracking-wider text-xs uppercase disabled:opacity-50"
            >
              {isReporting ? "Enviando..." : "Confirmar e Enviar Relato"}
            </button>
          )}
        </div>

        {/* Recent Reports List */}
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">
            Últimos Relatos (Colaborativo)
          </h3>
          
          {loadingReports ? (
            <div className="text-center py-6 text-slate-400 text-xs">Carregando relatos...</div>
          ) : portReports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs p-6 text-center text-slate-400 space-y-1">
               <p className="text-[10px] uppercase font-bold tracking-widest">Nenhum relato nas últimas horas</p>
               <p className="text-[9px]">A estimativa está usando apenas médias históricas.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {portReports.slice(0, 5).map((report, idx) => {
                const timeAgo = Math.round((Date.now() - new Date(report.timestamp).getTime()) / 60000);
                return (
                  <div key={idx} className="bg-white rounded-xl border border-slate-100 p-3 flex justify-between items-center shadow-3xs">
                    <div className="flex items-center gap-2">
                       <div className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${getStatusColor(report.status)}`}>
                         {report.status}
                       </div>
                       <span className="text-[10px] text-slate-600 font-medium">Caminhoneiro parceiro</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{timeAgo === 0 ? "Agora" : `${timeAgo} min atrás`}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="shrink-0 z-30">
        <BottomNavigation activeTab="portos" onNavigate={onNavigate} />
      </div>
    </div>
  );
}
