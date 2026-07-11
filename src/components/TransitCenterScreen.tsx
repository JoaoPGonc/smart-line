import React, { useState, useEffect } from "react";
import { ScreenId, TrafficAlert } from "../types";
import BottomNavigation from "./BottomNavigation";
import { 
  AlertTriangle, 
  Hammer, 
  CheckSquare, 
  ChevronRight, 
  User, 
  ArrowLeft,
  MapPin,
  Clock,
  Car,
  ThumbsDown
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, increment, where, orderBy } from "firebase/firestore";

interface TransitCenterScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export default function TransitCenterScreen({ onNavigate }: TransitCenterScreenProps) {
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(() => {
    const cached = localStorage.getItem("smartline_last_gps");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) { }
    }
    return null;
  });

  // Helper to calculate distance in km between two coordinates
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  useEffect(() => {
    // Get user's current GPS location on mount to filter nearby alerts
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLoc);
          localStorage.setItem("smartline_last_gps", JSON.stringify(newLoc));
        },
        (err) => {
          console.warn("Could not get current position in TransitCenterScreen:", err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    // Listen for active alerts that haven't expired
    const q = query(
      collection(db, "traffic_alerts"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const activeAlerts: TrafficAlert[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        
        // Calculate distance if coordinates are available
        const dist = data.lat !== undefined && data.lng !== undefined && userLocation 
          ? getDistanceKm(userLocation.lat, userLocation.lng, data.lat, data.lng)
          : null;

        // Show alert if it hasn't expired, has < 3 downvotes, and is within 15km (or if GPS is not yet loaded/denied)
        const isNear = !userLocation || (dist !== null && dist <= 15);

        if (data.expiresAt > now && (data.votesDown || 0) < 3 && isNear) {
          activeAlerts.push({
            id: docSnap.id,
            ...data
          } as TrafficAlert);
        }
      });
      
      setAlerts(activeAlerts);
    });

    return () => unsubscribe();
  }, [userLocation]);

  const handleVoteDown = async (alertId: string) => {
    try {
      const alertRef = doc(db, "traffic_alerts", alertId);
      await updateDoc(alertRef, {
        votesDown: increment(1)
      });
    } catch (e) {
      console.error("Error voting down alert:", e);
    }
  };

  const formatTimeAgo = (createdAt?: number) => {
    if (!createdAt) return "AGORA";
    const diff = Math.floor((Date.now() - createdAt) / 60000); // minutes
    if (diff < 1) return "AGORA";
    if (diff < 60) return `HÁ ${diff} MIN`;
    const hours = Math.floor(diff / 60);
    return `HÁ ${hours} HORAS`;
  };

  return (
    <div id="transit-center" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans relative">
      
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-12">
        
        {/* Header greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Central de Alertas
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Notificações de trânsito na sua região.
            </p>
          </div>
          <div className="bg-orange-50 text-orange-500 p-2 rounded-xl shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              ALERTAS DE CAMINHONEIROS
            </h3>
            <button 
              onClick={() => setShowAllAlerts(true)}
              className="text-[10px] font-black text-blue-900 uppercase tracking-wider hover:underline"
            >
              VER TODOS
            </button>
          </div>

          {/* Alerts Timeline List */}
          <div className="space-y-2.5">
            {alerts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 space-y-2">
                <AlertTriangle className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-xs font-bold uppercase tracking-wider">Sem alertas no momento</p>
                <p className="text-[10px] text-slate-400">Nenhum caminhoneiro submeteu alertas ou bloqueios na via até agora.</p>
              </div>
            ) : (
              // Display first 3 alerts on main view, click Ver Todos to see all
              alerts.slice(0, 3).map((alert) => {
                let IconComponent = AlertTriangle;
                let borderClass = "border-l-4 border-l-red-500";

                if (alert.type === "maintenance" || alert.type === "other") {
                  IconComponent = Hammer;
                  borderClass = "border-l-4 border-l-orange-500";
                } else if (alert.type === "blocked") {
                  IconComponent = CheckSquare;
                  borderClass = "border-l-4 border-l-blue-500";
                }

                return (
                  <div
                    key={alert.id}
                    className={`bg-white p-4 rounded-xl border border-slate-100 ${borderClass} shadow-3xs flex gap-3.5 items-start`}
                  >
                    <div className="p-2 rounded-lg bg-slate-50 text-slate-700 shrink-0">
                      <IconComponent className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="text-xs font-black text-slate-800 tracking-tight leading-tight uppercase truncate">
                          {alert.title}
                        </h4>
                        <span className="text-[8px] font-extrabold text-slate-400 font-mono tracking-wider shrink-0 uppercase">
                          {formatTimeAgo(alert.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-1 text-[9px] font-extrabold text-slate-400 uppercase">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{alert.location}</span>
                        </div>
                        
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Ainda está lá?</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVoteDown(alert.id);
                            }}
                            className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-md transition uppercase"
                          >
                            <ThumbsDown className="w-3 h-3" /> NÃO
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Emit traffic alert button */}
        <button
          onClick={() => onNavigate(ScreenId.EmitAlert)}
          className="w-full bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase"
        >
          <AlertTriangle className="w-4 h-4 text-orange-400 fill-orange-400 stroke-blue-950 stroke-[1.5]" />
          EMITIR ALERTA DE TRÁFEGO
        </button>
      </div>

      {/* FULL ALERTS OVERLAY (VER TODOS PAGE) */}
      {showAllAlerts && (
        <div className="absolute inset-0 bg-slate-50 z-50 flex flex-col animate-fade-in">
          {/* Header */}
          <div className="bg-white border-b border-slate-100 px-5 py-4 flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setShowAllAlerts(false)}
              className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-black text-slate-900">Alertas da Comunidade</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Todos os avisos e bloqueios ativos enviados por motoristas.</p>
            </div>
          </div>

          {/* List of alerts */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            {alerts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 space-y-3.5">
                <AlertTriangle className="w-10 h-10 mx-auto text-slate-300" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Nenhum bloqueio ou alerta</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Tudo limpo na rodovia! Não há nenhum registro de interdição ou lentidão submetido pelos motoristas no sistema.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                let IconComponent = AlertTriangle;
                let borderClass = "border-l-4 border-l-red-500";

                if (alert.type === "maintenance" || alert.type === "other") {
                  IconComponent = Hammer;
                  borderClass = "border-l-4 border-l-orange-500";
                } else if (alert.type === "blocked") {
                  IconComponent = CheckSquare;
                  borderClass = "border-l-4 border-l-blue-500";
                }

                return (
                  <div
                    key={`all-${alert.id}`}
                    className={`bg-white p-4.5 rounded-2xl border border-slate-100 ${borderClass} shadow-2xs flex gap-4 items-start`}
                  >
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-700 shrink-0">
                      <IconComponent className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex justify-between items-baseline gap-2">
                        <h4 className="text-xs font-black text-slate-800 tracking-tight leading-tight uppercase truncate">
                          {alert.title}
                        </h4>
                        <span className="text-[8px] font-extrabold text-slate-400 font-mono tracking-wider shrink-0 uppercase">
                          {formatTimeAgo(alert.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-1 text-[9px] font-extrabold text-slate-400 uppercase">
                          <MapPin className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                          <span className="truncate text-slate-600">{alert.location}</span>
                        </div>

                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Ainda está lá?</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVoteDown(alert.id);
                            }}
                            className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-md transition uppercase"
                          >
                            <ThumbsDown className="w-3 h-3" /> NÃO
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer close button */}
          <div className="bg-white border-t border-slate-100 p-4 shrink-0">
            <button
              onClick={() => setShowAllAlerts(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl text-xs transition uppercase tracking-wider"
            >
              Voltar ao Trânsito
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation activeTab="transito" onNavigate={onNavigate} />
    </div>
  );
}
