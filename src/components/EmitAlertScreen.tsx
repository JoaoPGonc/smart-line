import React, { useState, useEffect } from "react";
import { ScreenId, TrafficAlert } from "../types";
import BottomNavigation from "./BottomNavigation";
import { Car, TrafficCone, Hammer, AlertOctagon, CheckSquare, Square, ChevronRight, MapPin, RefreshCw, Ban, Users, CloudRain, ShieldAlert, PawPrint, ArrowLeft } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface EmitAlertScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export default function EmitAlertScreen({ onNavigate }: EmitAlertScreenProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [userLocationStr, setUserLocationStr] = useState<string>(() => {
    const cached = localStorage.getItem("smartline_last_gps");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.address) return parsed.address;
      } catch (e) {}
    }
    return "Localização Desconhecida";
  });
  
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(() => {
    const cached = localStorage.getItem("smartline_last_gps");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
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
        setUserCoords({ lat: latitude, lng: longitude });
        localStorage.setItem("smartline_last_gps", JSON.stringify({ lat: latitude, lng: longitude }));
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
            setUserLocationStr(locString);
            localStorage.setItem("smartline_last_gps", JSON.stringify({ lat: latitude, lng: longitude, address: locString }));
          } else {
            setUserLocationStr("Localização Desconhecida");
          }
        } catch (e) {
          setUserLocationStr("Localização Desconhecida");
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
      icon: Ban,
      description: "Interdição total de faixa devido a queda de barreira/carga.",
    },
    {
      id: "protest",
      title: "Manifestação",
      icon: Users,
      description: "Ato popular interditando parcialmente as pistas de acesso.",
    },
    {
      id: "weather",
      title: "Neblina / Chuva forte",
      icon: CloudRain,
      description: "Baixa visibilidade extrema na serra ou trecho urbano.",
    },
    {
      id: "radar",
      title: "Fiscalização / Balizamento",
      icon: ShieldAlert,
      description: "Ponto ativo de pesagem ou fiscalização na rodovia.",
    },
    {
      id: "animal",
      title: "Animal na Pista",
      icon: PawPrint,
      description: "Animal de grande porte avistado no acostamento ou na via.",
    }
  ];

  const handleSendAlert = async () => {
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

    // Calculate expiration based on type
    const now = Date.now();
    let durationMs = 3 * 60 * 60 * 1000; // Default: 3 hours
    
    if (selectedType === "animal") {
      durationMs = 1 * 60 * 60 * 1000; // 1 hour
    } else if (selectedType === "accident") {
      durationMs = 4 * 60 * 60 * 1000; // 4 hours
    } else if (selectedType === "protest" || selectedType === "blocked") {
      durationMs = 8 * 60 * 60 * 1000; // 8 hours
    }

    const expiresAt = now + durationMs;

    try {
      const alertData = {
        type: mappedType,
        title: chosen.title.toUpperCase() + " RECENTE",
        description: chosen.description,
        location: userLocationStr,
        severity: selectedType === "blocked" || selectedType === "accident" || selectedType === "protest" ? "high" : "medium",
        createdAt: now,
        expiresAt: expiresAt,
        votesDown: 0,
        authorId: auth.currentUser?.uid || "anonymous",
        lat: userCoords?.lat || -20.3335,
        lng: userCoords?.lng || -40.2820
      };

      await addDoc(collection(db, "traffic_alerts"), alertData);
      onNavigate(ScreenId.AlertSuccess);
    } catch (err) {
      console.error("Error saving alert to Firestore:", err);
      setError("Falha ao salvar alerta. Tente novamente.");
    }
  };

  return (
    <div id="emit-alert" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans justify-between">
      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-12">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate(ScreenId.TransitCenter)}
            className="p-2 -ml-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Emitir Alerta
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecione o tipo de evento na rodovia.
            </p>
          </div>
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
