import React, { useState, useEffect } from "react";
import { ScreenId, TrafficAlert } from "../types";
import BottomNavigation from "./BottomNavigation";
import { Car, TrafficCone, Hammer, AlertOctagon, CheckSquare, Square, ChevronRight, MapPin, RefreshCw } from "lucide-react";

interface EmitAlertScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onAddAlert: (alert: TrafficAlert) => void;
}

export default function EmitAlertScreen({ onNavigate, onAddAlert }: EmitAlertScreenProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [userLocationStr, setUserLocationStr] = useState<string>("BR-101, Km 260");
  const [isLocating, setIsLocating] = useState(false);

  // Obtain GPS coordinates and reverse geocode them on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by this browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use free OpenStreetMap Nominatim reverse geocoder
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=16`,
            { headers: { "User-Agent": "CaminhoneiroApp/1.0" } }
          );
          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            const road = address.road || address.suburb || "Rodovia BR-101";
            const city = address.city || address.town || address.village || "";
            const state = address.state_code || address.state || "";
            let locString = road;
            if (city) locString += `, ${city}`;
            if (state) locString += ` - ${state}`;
            locString += ` (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
            setUserLocationStr(locString);
          } else {
            setUserLocationStr(`Rodovia BR-101 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        } catch (e) {
          setUserLocationStr(`Rodovia BR-101 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn("GPS lookup denied or failed:", err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Realistic prefilled options mapping to support the dynamic state
  const alertOptions = [
    {
      id: "accident",
      title: "Acidente",
      icon: Car,
      description: "Colisão de veículos na rodovia causando lentidão parcial.",
    },
    {
      id: "congestion",
      title: "Congestionamento",
      icon: TrafficCone,
      description: "Tráfego intenso com lentidão de fluxo na aproximação do pátio.",
    },
    {
      id: "maintenance",
      title: "Obras na pista",
      icon: Hammer,
      description: "Equipes de manutenção trabalhando na sinalização horizontal.",
    },
    {
      id: "blocked",
      title: "Pista interditada",
      icon: AlertOctagon,
      description: "Interdição total de faixa devido a queda de barreira/carga.",
    },
    {
      id: "protest",
      title: "Manifestação",
      icon: AlertOctagon,
      description: "Ato popular interditando parcialmente as pistas de acesso.",
    },
    {
      id: "weather",
      title: "Neblina / Chuva forte",
      icon: AlertOctagon,
      description: "Baixa visibilidade extrema na serra ou trecho urbano.",
    },
    {
      id: "radar",
      title: "Fiscalização / Balizamento",
      icon: TrafficCone,
      description: "Ponto ativo de pesagem ou fiscalização na rodovia.",
    },
    {
      id: "animal",
      title: "Animal na Pista",
      icon: Car,
      description: "Animal de grande porte avistado no acostamento ou na via.",
    }
  ];

  const handleSendAlert = () => {
    if (!selectedType) {
      setError("Por favor, selecione um tipo de alerta antes de enviar.");
      return;
    }
    setError("");
    const chosen = alertOptions.find((o) => o.id === selectedType)!;
    
    // Map our enriched types safely to the database types
    const mappedType: "accident" | "congestion" | "maintenance" | "blocked" | "other" =
      selectedType === "protest" ? "blocked" :
      (selectedType === "weather" || selectedType === "radar" || selectedType === "animal") ? "other" : 
      selectedType as any;

    const newAlert: TrafficAlert = {
      id: `alert-${Date.now()}`,
      type: mappedType,
      title: chosen.title.toUpperCase() + " RECENTE",
      description: chosen.description,
      timeAgo: "AGORA",
      location: userLocationStr,
      severity: selectedType === "blocked" || selectedType === "accident" || selectedType === "protest" ? "high" : "medium",
    };

    onAddAlert(newAlert);
    onNavigate(ScreenId.AlertSuccess);
  };

  return (
    <div id="emit-alert" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans justify-between">
      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-12">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Emitir Alerta
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecione o tipo de evento na rodovia para alertar a comunidade.
          </p>
        </div>

        {/* Real-time Location Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isLocating ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
            {isLocating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4 fill-current text-blue-900" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
              {isLocating ? "Sintonizando Sinal GPS..." : "Sua Localização GPS"}
            </span>
            <p className="text-xs font-bold text-slate-700 mt-0.5 truncate leading-tight">
              {userLocationStr}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-[11px] p-3 rounded-xl font-extrabold border border-red-100 flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Options List */}
        <div className="space-y-3">
          {alertOptions.map((opt) => {
            const IconComp = opt.icon;
            const isSelected = selectedType === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => setSelectedType(opt.id)}
                className={`w-full text-left p-4 rounded-2xl border flex items-center justify-between transition-all duration-200 ${
                  isSelected
                    ? "bg-blue-950/5 border-blue-900 shadow-xs"
                    : "bg-white border-slate-100 hover:border-slate-200 shadow-2xs"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl transition ${
                      isSelected ? "bg-blue-950 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 leading-none">
                      {opt.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] truncate">
                      {opt.description}
                    </p>
                  </div>
                </div>

                {/* Checkbox indicator */}
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-blue-950 border-blue-950 text-white"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                      <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSendAlert}
          className="w-full bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-md tracking-wider text-xs transition uppercase"
        >
          ENVIAR ALERTA
        </button>
      </div>

      {/* Reusable bottom navigation */}
      <BottomNavigation activeTab="transito" onNavigate={onNavigate} />
    </div>
  );
}
