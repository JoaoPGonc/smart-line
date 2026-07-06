import React, { useState } from "react";
import { ScreenId, Appointment } from "../types";
import BottomNavigation from "./BottomNavigation";
import { Calendar as CalendarIcon, MapPin, ArrowRight, AlertCircle, RefreshCw, Navigation, Trash2, Clock } from "lucide-react";
import { calculateDynamicStops, parseDurationMinutes, fetchDynamicStopsFromOSM } from "../utils/routeUtils";
import { auth } from "../lib/firebase";
import { logPortAppointment } from "../utils/portQueueService";

interface ScheduleScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSetAppointment: (appointment: Appointment) => void;
  onDeleteAppointment?: (index: number) => void;
  originCoords: { lat: number; lng: number; name: string } | null;
  destCoords: { lat: number; lng: number; name: string } | null;
  onSetOriginCoords: (coords: { lat: number; lng: number; name: string }) => void;
  onSetDestCoords: (coords: { lat: number; lng: number; name: string }) => void;
  appointments?: Appointment[];
}

export default function ScheduleScreen({ 
  onNavigate, 
  onSetAppointment,
  onDeleteAppointment,
  originCoords,
  destCoords,
  onSetOriginCoords,
  onSetDestCoords,
  appointments = []
}: ScheduleScreenProps) {
  const [origin, setOrigin] = useState(originCoords?.name || "");
  const [destination, setDestination] = useState(destCoords?.name || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");

  const [queueTime, setQueueTime] = useState("1h 45m");
  const [detectingGps, setDetectingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("ANALISANDO ROTA...");
  const [gpsError, setGpsError] = useState("");

  // Trucker needs states
  const [stopIntervalHours, setStopIntervalHours] = useState<number>(4);
  const [requiresShower, setRequiresShower] = useState<boolean>(false);
  const [requiresMeal, setRequiresMeal] = useState<boolean>(false);
  const [requiresSecurity, setRequiresSecurity] = useState<boolean>(false);
  const [requiresScale, setRequiresScale] = useState<boolean>(false);

  // Helper to parse duration to minutes
  const parseDurationMinutesLocal = (durStr: string) => {
    let total = 275; // default fallback 4h 35m
    try {
      const match = durStr.match(/(\d+)h\s*(\d+)m/);
      if (match) {
        total = parseInt(match[1]) * 60 + parseInt(match[2]);
      } else {
        const hMatch = durStr.match(/(\d+)h/);
        if (hMatch) total = parseInt(hMatch[1]) * 60;
      }
    } catch (e) {}
    return total;
  };

  // Calculation of suggested departure time
  const getSuggestedDepartureTime = () => {
    if (!time || !time.includes(":")) return null;
    
    let distanceKm = 275; // fallback
    let start = originCoords || { lat: -18.0253, lng: -40.1509 };
    let end = destCoords || { lat: -20.2831, lng: -40.2435 };

    if (originCoords && destCoords) {
      start = originCoords;
      end = destCoords;
      const R = 6371; // km
      const dLat = ((end.lat - start.lat) * Math.PI) / 180;
      const dLon = ((end.lng - start.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((start.lat * Math.PI) / 180) *
          Math.cos((end.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distanceKm = R * c;
    }

    const durationMins = Math.round((distanceKm / 65) * 60);
    
    const dynamicStops = calculateDynamicStops(
      start,
      end,
      "00:00",
      `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
      {
        stopIntervalHours,
        requiresShower,
        requiresMeal,
        requiresSecurity,
        requiresScale,
      }
    );
    const stopsCount = dynamicStops.length;
    const stopsDurationMins = stopsCount * 30; // 30 mins per stop

    // Traffic delay: simulated delay based on travel distance
    const trafficDelayMins = Math.round(durationMins * 0.12); // 12% traffic delay

    const totalLeadMins = durationMins + stopsDurationMins + trafficDelayMins;

    try {
      const [ah, am] = time.split(":").map(Number);
      if (!isNaN(ah) && !isNaN(am)) {
        let totalArrivalMins = ah * 60 + am;
        let departureMins = totalArrivalMins - totalLeadMins;
        
        if (departureMins < 0) {
          departureMins += 24 * 60; // wrap around previous day
        }
        
        const depH = Math.floor(departureMins / 60) % 24;
        const depM = departureMins % 60;
        
        return {
          departureTime: `${depH.toString().padStart(2, "0")}:${depM.toString().padStart(2, "0")}`,
          durationText: `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`,
          stopsCount,
          stopsDurationText: `${Math.floor(stopsDurationMins / 60)}h ${stopsDurationMins % 60}m`,
          trafficDelayText: `${trafficDelayMins}m`,
          totalLeadMins,
          totalLeadText: `${Math.floor(totalLeadMins / 60)}h ${totalLeadMins % 60}m`,
          stops: dynamicStops
        };
      }
    } catch (e) {}
    
    return null;
  };

  // Simulated queue hours for the graph
  const hourlyQueue = [
    { hour: "10:00", value: 20, active: !!time && time.startsWith("10:") },
    { hour: "11:00", value: 35, active: !!time && time.startsWith("11:00") },
    { hour: "11:30", value: 85, active: !time || time === "11:30" || (!!time && time.startsWith("11:3")) }, // Default or chosen 11:30
    { hour: "13:00", value: 55, active: !!time && time.startsWith("13:") },
    { hour: "15:00", value: 30, active: !!time && time.startsWith("15:") },
    { hour: "18:00", value: 15, active: !!time && time.startsWith("18:") },
  ];

  // Browser Geolocation GPS locator
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Seu navegador não oferece suporte para geolocalização.");
      return;
    }
    setDetectingGps(true);
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode via OpenStreetMap Nominatim API (100% free)
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          .then((res) => {
            if (!res.ok) throw new Error("API error");
            return res.json();
          })
          .then((data) => {
            const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setOrigin(address);
            onSetOriginCoords({
              lat: latitude,
              lng: longitude,
              name: address
            });
          })
          .catch(() => {
            const fallbackAddr = `Minha Localização (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
            setOrigin(fallbackAddr);
            onSetOriginCoords({
              lat: latitude,
              lng: longitude,
              name: fallbackAddr
            });
          })
          .finally(() => {
            setDetectingGps(false);
          });
      },
      (error) => {
        console.error("GPS Error:", error);
        // Fallback to a default location if GPS fails
        const fallbackLat = -20.2976;
        const fallbackLng = -40.2958;
        const fallbackAddr = "Vitória, ES (Localização Padrão)";
        setOrigin(fallbackAddr);
        onSetOriginCoords({
          lat: fallbackLat,
          lng: fallbackLng,
          name: fallbackAddr
        });
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleConfirm = async () => {
    if (!origin.trim()) {
      setError("Por favor, preencha o ponto de partida.");
      return;
    }
    if (!destination.trim()) {
      setError("Por favor, preencha o ponto de chegada.");
      return;
    }
    if (!date.trim()) {
      setError("Por favor, preencha a data prevista.");
      return;
    }
    if (!time.trim()) {
      setError("Por favor, preencha o horário.");
      return;
    }
    setError("");
    setGeocoding(true);
    setLoadingLabel("GEOCODIFICANDO ORIGEM...");
    let finalOriginCoords = originCoords;

    // 1. Geocode text address if custom search text was written (Restricted to Brazil)
    if (!originCoords || originCoords.name !== origin) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(origin)}&format=json&limit=1&countrycodes=br`);
        const data = await res.json();
        if (data && data[0]) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          finalOriginCoords = {
            lat,
            lng,
            name: origin
          };
          onSetOriginCoords(finalOriginCoords);
        }
      } catch (err) {
        console.warn("Could not geocode input, using fallback coords", err);
      }
    }

    setLoadingLabel("GEOCODIFICANDO DESTINO...");
    let finalDestCoords = destCoords;

    // 2. Geocode destination address if custom search text was written (Restricted to Brazil)
    if (!destCoords || destCoords.name !== destination) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1&countrycodes=br`);
        const data = await res.json();
        if (data && data[0]) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          finalDestCoords = {
            lat,
            lng,
            name: destination
          };
          onSetDestCoords(finalDestCoords);
        } else {
          // fallback to Porto de Tubarão
          finalDestCoords = { lat: -20.2831, lng: -40.2435, name: destination };
          onSetDestCoords(finalDestCoords);
        }
      } catch (err) {
        console.warn("Could not geocode destination, using fallback", err);
        finalDestCoords = { lat: -20.2831, lng: -40.2435, name: destination };
        onSetDestCoords(finalDestCoords);
      }
    } else if (!finalDestCoords) {
      finalDestCoords = { lat: -20.2831, lng: -40.2435, name: destination };
      onSetDestCoords(finalDestCoords);
    }

    setLoadingLabel("ESTIMANDO TEMPO E DISTÂNCIA...");
    // 3. Calculate distance and trip duration
    const start = finalOriginCoords || { lat: -18.0253, lng: -40.1509 };
    const end = finalDestCoords;

    // Haversine formula
    const R = 6371; // km
    const dLat = ((end.lat - start.lat) * Math.PI) / 180;
    const dLon = ((end.lng - start.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((start.lat * Math.PI) / 180) *
        Math.cos((end.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    // Validation: Ensure there is no oceanic/unreasonable route (over 3800 km inside Brazil)
    if (distanceKm > 3800) {
      setError("A rota excede 3.800 km (sem ligação terrestre viável ou fora do país). Por favor, verifique se digitou os endereços ou portos corretos localizados no Brasil.");
      setGeocoding(false);
      return;
    }

    // Estimating average freight speed as 65 km/h
    const durationHours = distanceKm / 65;
    const durationMins = Math.round(durationHours * 60);
    const hoursPart = Math.floor(durationMins / 60);
    const minsPart = durationMins % 60;

    // Calculate suggested departure based on the user's input arrival time ('time')
    const dynamicStops = calculateDynamicStops(
      start,
      end,
      "00:00",
      `${hoursPart}h ${minsPart}m`,
      {
        stopIntervalHours,
        requiresShower,
        requiresMeal,
        requiresSecurity,
        requiresScale,
      }
    );
    const stopsCount = dynamicStops.length;
    const stopsDurationMins = stopsCount * 30;
    const trafficDelayMins = Math.round(durationMins * 0.12);
    const totalLeadMins = durationMins + stopsDurationMins + trafficDelayMins;
    const totalDurationHoursPart = Math.floor(totalLeadMins / 60);
    const totalDurationMinsPart = totalLeadMins % 60;

    let departureHourStr = "11:30";
    let arrivalHourStr = time;
    let departureDateStr = date;

    try {
      const [ah, am] = time.split(":").map(Number);
      if (!isNaN(ah) && !isNaN(am)) {
        if (date) {
          const [y, m, d] = date.split('-');
          const dateObj = new Date(Number(y), Number(m)-1, Number(d), ah, am, 0);
          
          // Subtract total lead minutes
          dateObj.setMinutes(dateObj.getMinutes() - totalLeadMins);
          
          const depY = dateObj.getFullYear();
          const depMo = String(dateObj.getMonth() + 1).padStart(2, '0');
          const depD = String(dateObj.getDate()).padStart(2, '0');
          departureDateStr = `${depY}-${depMo}-${depD}`;

          const depH = dateObj.getHours();
          const depM = dateObj.getMinutes();
          departureHourStr = `${depH.toString().padStart(2, "0")}:${depM.toString().padStart(2, "0")}`;
        } else {
          // Fallback if no date (shouldn't happen as date is required)
          let totalArrivalMins = ah * 60 + am;
          let departureMins = totalArrivalMins - totalLeadMins;
          while (departureMins < 0) departureMins += 24 * 60;
          const depH = Math.floor(departureMins / 60) % 24;
          const depM = departureMins % 60;
          departureHourStr = `${depH.toString().padStart(2, "0")}:${depM.toString().padStart(2, "0")}`;
        }
      }
    } catch (e) {}

    setLoadingLabel("PROCURANDO PARADAS NO OPENSTREETMAP...");
    // Recalculate stops with final departureHourStr fetching real OSM gas stations along the corridor!
    const finalStops = await fetchDynamicStopsFromOSM(
      start,
      end,
      departureHourStr,
      `${totalDurationHoursPart}h ${totalDurationMinsPart}m`,
      {
        stopIntervalHours,
        requiresShower,
        requiresMeal,
        requiresSecurity,
        requiresScale,
      }
    );

    let portAppId: string | null = null;
    if (auth.currentUser) {
      portAppId = await logPortAppointment(destination, date, arrivalHourStr, auth.currentUser.uid);
    }
    
    const appointment: Appointment = {
      origin,
      destination,
      date,
      departureDate: departureDateStr,
      arrivalDate: date,
      time: departureHourStr, // Saved as the suggested departure time!
      estimatedDuration: `${totalDurationHoursPart}h ${totalDurationMinsPart}m`,
      estimatedArrival: arrivalHourStr, // Desired arrival time is stored here
      portQueueTime: queueTime,
      savingsMinutes: 40,
      status: "confirmed",
      portAppointmentId: portAppId || undefined,
      driverNeeds: {
        stopIntervalHours,
        requiresShower,
        requiresMeal,
        requiresSecurity,
        requiresScale,
      },
      customStops: finalStops,
    };
    
    onSetAppointment(appointment);
    
    setGeocoding(false);
    onNavigate(ScreenId.ScheduleConfirmed);
  };

  return (
    <div id="schedule-screen" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-12">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-blue-950 font-sans tracking-tight">
            Agendar Chegada
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecione o terminal e o horário para sua operação.
          </p>
        </div>

        {/* Booking Form Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-[11px] p-2.5 rounded-lg font-medium border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}
          {/* Origin */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" /> PONTO DE PARTIDA
              </label>
            </div>

            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs text-slate-700 font-medium focus:outline-none focus:bg-white focus:border-blue-900 transition"
              placeholder="Digite cidade, estado ou endereço"
            />

            <button 
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingGps}
              className="mt-2 w-full bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-900 border border-blue-200 font-extrabold py-2.5 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2 tracking-wider text-xs uppercase transition disabled:opacity-50 cursor-pointer"
            >
              {detectingGps ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-900" /> LOCALIZANDO...
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5 text-blue-900 fill-blue-900" /> usar localização atual
                </>
              )}
            </button>

            {gpsError && (
              <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {gpsError}
              </p>
            )}
          </div>

          {/* Destination */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-500" /> PONTO DE CHEGADA
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs text-slate-700 font-medium focus:outline-none focus:bg-white focus:border-blue-900 transition"
              placeholder="Digite o endereço, porto ou ponto de chegada"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                DATA PREVISTA
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs text-slate-700 font-medium focus:outline-none focus:bg-white focus:border-blue-900 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                CHEGADA NO PORTO
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs text-slate-700 font-medium focus:outline-none focus:bg-white focus:border-blue-900 transition"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium leading-tight">
            💡 Insira o horário em que você precisa <b>chegar</b> ao porto para o descarregamento. O aplicativo calculará automaticamente o horário ideal de saída.
          </p>
        </div>

        {/* Driver Needs Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-50">
            <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">
              Necessidades do Caminhoneiro
            </h3>
            <span className="bg-amber-50 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-md uppercase border border-amber-100">
              Dinamizar Paradas
            </span>
          </div>

          {/* Stop Interval Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Frequência de Paradas para Descanso
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 2, label: "Frequente", desc: "A cada 2h" },
                { value: 3, label: "Recomendado", desc: "A cada 3h" },
                { value: 4, label: "Normal", desc: "A cada 4h" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStopIntervalHours(opt.value)}
                  className={`py-2 px-1 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    stopIntervalHours === opt.value
                      ? "bg-blue-950 border-blue-950 text-white shadow-xs"
                      : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100/60"
                  }`}
                >
                  <span className="text-[10px] font-black tracking-wide uppercase">{opt.label}</span>
                  <span className={`text-[8px] font-bold mt-0.5 ${stopIntervalHours === opt.value ? "text-blue-200" : "text-slate-400"}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Facility Checkboxes */}
          <div className="space-y-3 pt-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Serviços Essenciais Desejados nas Paradas
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  id: "shower",
                  label: "Banho Quente",
                  checked: requiresShower,
                  onChange: setRequiresShower,
                  icon: "🚿",
                },
                {
                  id: "meal",
                  label: "Refeição Completa",
                  checked: requiresMeal,
                  onChange: setRequiresMeal,
                  icon: "🍛",
                },
                {
                  id: "security",
                  label: "Pátio Seguro",
                  checked: requiresSecurity,
                  onChange: setRequiresSecurity,
                  icon: "🔒",
                },
                {
                  id: "scale",
                  label: "Balança Ativa",
                  checked: requiresScale,
                  onChange: setRequiresScale,
                  icon: "⚖️",
                },
              ].map((facility) => (
                <button
                  key={facility.id}
                  type="button"
                  onClick={() => facility.onChange(!facility.checked)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    facility.checked
                      ? "bg-emerald-50 border-emerald-300 text-emerald-950 shadow-3xs"
                      : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100/60"
                  }`}
                >
                  <span className={`text-sm ${!facility.checked ? "grayscale opacity-60" : ""}`}>{facility.icon}</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-extrabold leading-tight truncate">{facility.label}</span>
                    <span className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">
                      {facility.checked ? "Selecionado" : "Opcional"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            disabled={geocoding}
            className="w-full bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase disabled:opacity-50"
          >
            {geocoding ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> {loadingLabel}
              </>
            ) : (
              <>
                CONFIRMAR AGENDAMENTO <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Cancel Appointments Section */}
        {appointments.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs mt-4">
            <h3 className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Gerenciar Agendamentos
            </h3>
            <div className="space-y-3">
              {appointments.map((app, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl">
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="text-xs font-black text-slate-800 truncate">
                      {app.origin?.split(",")[0] || "Origem"} → {app.destination?.split(",")[0] || "Destino"}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" /> {app.date} às {app.time}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteAppointment && onDeleteAppointment(index)}
                    className="flex-shrink-0 bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors border border-red-100"
                    title="Cancelar agendamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Reusable Tab Navigation Bar */}
      <BottomNavigation activeTab="agendar" onNavigate={onNavigate} />
    </div>
  );
}
