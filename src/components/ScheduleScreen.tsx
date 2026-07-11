import React, { useState, useEffect, useRef } from "react";
import { ScreenId, Appointment } from "../types";
import BottomNavigation from "./BottomNavigation";
import { Calendar as CalendarIcon, MapPin, ArrowRight, ArrowLeft, AlertCircle, RefreshCw, Navigation, Trash2, Clock, HelpCircle, X } from "lucide-react";
import { calculateDynamicStops, calculateRouteSpanMins, parseDurationMinutes, fetchDynamicStopsFromOSM, reassignStopTimes, OSMRouteStopsResult } from "../utils/routeUtils";
import { formatAddress } from "../formatDateHelper";
import { auth } from "../lib/firebase";
import { BRAZILIAN_PORTS, logPortAppointment } from "../utils/portQueueService";

interface ScheduleScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onSetAppointment: (appointment: Appointment) => void;
  onDeleteAppointment?: (index: number) => void;
  onSelectAppointment?: (index: number) => void;
  originCoords: { lat: number; lng: number; name: string } | null;
  destCoords: { lat: number; lng: number; name: string } | null;
  onSetOriginCoords: (coords: { lat: number; lng: number; name: string }) => void;
  onSetDestCoords: (coords: { lat: number; lng: number; name: string }) => void;
  appointments?: Appointment[];
}

const PORTS_LIST = BRAZILIAN_PORTS.map(port => `${port.name.toUpperCase()} - ${port.state}`);

export default function ScheduleScreen({ 
  onNavigate, 
  onSetAppointment,
  onDeleteAppointment,
  onSelectAppointment,
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
  const [showHint, setShowHint] = useState(false);
  const [step, setStep] = useState(1);
  const [appointmentToDelete, setAppointmentToDelete] = useState<number | null>(null);

  const [queueTime, setQueueTime] = useState("1h 45m");
  const [detectingGps, setDetectingGps] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("ANALISANDO ROTA...");
  const [gpsError, setGpsError] = useState("");

  const [originSuggestions, setOriginSuggestions] = useState<{name: string, lat: number, lng: number}[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  const handleOriginChange = (val: string) => {
    setOrigin(val);
    if (!val.trim()) {
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
      return;
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&countrycodes=br`);
        const data = await res.json();
        if (data && data.length > 0) {
          const suggestions = data.map((d: any) => ({
            name: d.display_name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon)
          }));
          setOriginSuggestions(suggestions);
          setShowOriginSuggestions(true);
        } else {
          setOriginSuggestions([]);
          setShowOriginSuggestions(false);
        }
      } catch (err) {
        console.error("Autocomplete error", err);
      }
    }, 500);
  };

  const selectOriginSuggestion = (sug: {name: string, lat: number, lng: number}) => {
    setOrigin(sug.name);
    onSetOriginCoords(sug);
    setShowOriginSuggestions(false);
  };

  const handleDestChange = (val: string) => {
    setDestination(val);
    if (!val.trim()) {
      setDestSuggestions([]);
      setShowDestSuggestions(false);
      return;
    }

    const filtered = PORTS_LIST.filter((p) => p.toLowerCase().includes(val.toLowerCase()));
    setDestSuggestions(filtered);
    setShowDestSuggestions(true);
  };

  const handleDestFocus = () => {
    if (destination.trim()) {
      const filtered = PORTS_LIST.filter((p) => p.toLowerCase().includes(destination.toLowerCase()));
      setDestSuggestions(filtered);
    } else {
      setDestSuggestions(PORTS_LIST);
    }
    setShowDestSuggestions(true);
  };

  const selectDestSuggestion = (port: string) => {
    setDestination(port);
    const selectedPort = BRAZILIAN_PORTS.find(
      (p) => `${p.name.toUpperCase()} - ${p.state}` === port
    );
    if (selectedPort) {
      onSetDestCoords({
        lat: selectedPort.coords.lat,
        lng: selectedPort.coords.lng,
        name: port
      });
    }
    setShowDestSuggestions(false);
  };

  useEffect(() => {
    if (destCoords?.name) {
      setDestination(destCoords.name);
    }
  }, [destCoords]);

  // Trucker needs states
  const [stopIntervalHours, setStopIntervalHours] = useState<number>(4);
  const [stopDurationMinutes, setStopDurationMinutes] = useState<number>(30);
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
        stopDurationMinutes,
        requiresShower,
        requiresMeal,
        requiresSecurity,
        requiresScale,
      }
    );
    const stopsCount = dynamicStops.length;
    const stopsDurationMins = stopsCount * stopDurationMinutes; // per-stop duration from user

    // Traffic delay: simulated delay based on travel distance
    const trafficDelayMins = Math.round(durationMins * 0.12); // 12% traffic delay

    const activeMins = durationMins + stopsDurationMins + trafficDelayMins;
    const restsCount = Math.floor((Math.max(0, activeMins - 1)) / (8 * 60)); // 1 interjornada rest (11h) per 8h of work
    const restDurationMins = restsCount * 11 * 60;
    
    const totalLeadMins = activeMins + restDurationMins;

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
        console.warn("GPS Location unavailable, using default fallback:", error?.message || error);
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

  useEffect(() => {
    if (destCoords?.name) {
      setDestination(destCoords.name);
    }
  }, [destCoords]);

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
        stopDurationMinutes,
        requiresShower,
        requiresMeal,
        requiresSecurity,
        requiresScale,
      }
    );

    const totalSpanMins = calculateRouteSpanMins(
      durationMins,
      dynamicStops,
      {
        stopIntervalHours,
        stopDurationMinutes,
        requiresShower,
        requiresMeal,
        requiresSecurity,
        requiresScale,
      }
    );

    const totalDurationHoursPart = Math.floor(totalSpanMins / 60);
    const totalDurationMinsPart = totalSpanMins % 60;
    const totalLeadMins = totalSpanMins;

    let departureHourStr = "11:30";
    let arrivalHourStr = time;
    let departureDateStr = date;

    try {
      const [ah, am] = time.split(":").map(Number);
      if (!isNaN(ah) && !isNaN(am)) {
        if (date) {
          const [y, m, d] = date.split('-');
          const arrivalDateObj = new Date(Number(y), Number(m) - 1, Number(d), ah, am, 0);

          // Subtract the full travel span (driving + stops + traffic + sleep rest) to get departure
          arrivalDateObj.setMinutes(arrivalDateObj.getMinutes() - totalSpanMins);

          const depY = arrivalDateObj.getFullYear();
          const depMo = String(arrivalDateObj.getMonth() + 1).padStart(2, '0');
          const depD = String(arrivalDateObj.getDate()).padStart(2, '0');
          departureDateStr = `${depY}-${depMo}-${depD}`;

          const depH = arrivalDateObj.getHours();
          const depM = arrivalDateObj.getMinutes();
          departureHourStr = `${depH.toString().padStart(2, "0")}:${depM.toString().padStart(2, "0")}`;
        } else {
          // Fallback if no date (shouldn't happen as date is required)
          let totalArrivalMins = ah * 60 + am;
          let departureMins = totalArrivalMins - totalSpanMins;
          while (departureMins < 0) departureMins += 24 * 60;
          const depH = Math.floor(departureMins / 60) % 24;
          const depM = departureMins % 60;
          departureHourStr = `${depH.toString().padStart(2, "0")}:${depM.toString().padStart(2, "0")}`;
        }
      }
    } catch (e) {
      console.error('Failed to compute departure time', e);
    }

    setLoadingLabel("PROCURANDO PARADAS...");
    // Fetch candidate stops along the real route and assign times using an initial departure estimate.
    const fetched = await fetchDynamicStopsFromOSM(
      start,
      end,
      departureHourStr,
      `${hoursPart}h ${minsPart}m`,
      {
        stopIntervalHours,
        stopDurationMinutes,
        requiresShower,
        requiresMeal,
        requiresSecurity,
        requiresScale,
      }
    );
    let finalStops = fetched.stops;
    const actualDrivingDurationMins = fetched.routeDurationMins;

    // Recompute departure based on the actual span of the route with the selected stops.
    const actualSpanMins = calculateRouteSpanMins(actualDrivingDurationMins, finalStops, {
      stopIntervalHours,
      stopDurationMinutes,
      requiresShower,
      requiresMeal,
      requiresSecurity,
      requiresScale,
    });

    try {
      const [ah, am] = time.split(":").map(Number);
      if (!isNaN(ah) && !isNaN(am) && date) {
        const [y, m, d] = date.split('-');
        const arrivalDateObj = new Date(Number(y), Number(m) - 1, Number(d), ah, am, 0);
        arrivalDateObj.setMinutes(arrivalDateObj.getMinutes() - actualSpanMins);

        const depY = arrivalDateObj.getFullYear();
        const depMo = String(arrivalDateObj.getMonth() + 1).padStart(2, '0');
        const depD = String(arrivalDateObj.getDate()).padStart(2, '0');
        departureDateStr = `${depY}-${depMo}-${depD}`;

        const depH = arrivalDateObj.getHours();
        const depM = arrivalDateObj.getMinutes();
        departureHourStr = `${depH.toString().padStart(2, "0")}:${depM.toString().padStart(2, "0")}`;
      }
    } catch (e) {
      console.error('Failed to recompute departure from actual route span', e);
    }

    finalStops = reassignStopTimes(departureHourStr, actualDrivingDurationMins, finalStops, {
      stopIntervalHours,
      stopDurationMinutes,
      requiresShower,
      requiresMeal,
      requiresSecurity,
      requiresScale,
    });

    let currentDaysOffset = 0;
    const [depH, depM] = departureHourStr.split(":").map(Number);
    let previousTotalMins = depH * 60 + depM;

    for (const stop of finalStops) {
      if (stop.time) {
        const [sh, sm] = stop.time.split(":").map(Number);
        if (!isNaN(sh) && !isNaN(sm)) {
          const stopMins = sh * 60 + sm;
          if (stopMins < previousTotalMins) {
            currentDaysOffset++;
          }
          if (currentDaysOffset > 0) {
            const d = new Date(departureDateStr + "T12:00:00");
            d.setDate(d.getDate() + currentDaysOffset);
            const newY = d.getFullYear();
            const newMo = String(d.getMonth() + 1).padStart(2, "0");
            const newD = String(d.getDate()).padStart(2, "0");
            stop.date = `${newY}-${newMo}-${newD}`;
          } else {
            stop.date = departureDateStr;
          }
          previousTotalMins = stopMins;
        }
      }
    }

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
      drivingDuration: `${Math.floor(actualDrivingDurationMins / 60)}h ${actualDrivingDurationMins % 60}m`,
      estimatedArrival: arrivalHourStr, // Desired arrival time is stored here
      portQueueTime: queueTime,
      savingsMinutes: 40,
      status: "confirmed",
      driverNeeds: {
        stopIntervalHours,
        stopDurationMinutes,
        requiresShower,
        requiresMeal,
        requiresSecurity,
        requiresScale,
      },
      customStops: finalStops.map(s => ({ ...s, durationMinutes: s.durationMinutes ?? stopDurationMinutes })),
    };
    
    if (portAppId) {
      appointment.portAppointmentId = portAppId;
    }
    
    onSetAppointment(appointment);
    
    setGeocoding(false);
    onNavigate(ScreenId.ScheduleConfirmed);
  };

  return (
    <div id="schedule-screen" className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate(ScreenId.RouteOverview)}
              className="bg-white text-blue-950 border border-slate-200 hover:bg-slate-50 p-2 rounded-xl shadow-xs transition cursor-pointer flex-shrink-0"
              title="Voltar"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-blue-950 font-sans tracking-tight">
                Agendar Chegada
              </h2>
              <button
                onClick={() => setShowHint(true)}
                className="inline-flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Como funciona o agendamento"
                aria-label="Como funciona o agendamento"
                aria-haspopup="dialog"
                aria-expanded={showHint}
                aria-controls="schedule-help-dialog"
              >
                <HelpCircle className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Hint Box */}
        {showHint && (
          <div
            id="schedule-help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-help-title"
            className="bg-blue-50 border border-blue-100 p-4 rounded-2xl relative"
          >
            <button
              onClick={() => setShowHint(false)}
              className="absolute top-2 right-2 text-blue-400 hover:text-blue-600 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Fechar ajuda"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 id="schedule-help-title" className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" aria-hidden="true" /> Como funciona o agendamento
            </h3>
            <p className="text-xs text-blue-800 font-medium leading-relaxed mb-3">
              Informe a origem e o destino, escolha a data e o horário de chegada desejado. O sistema calcula automaticamente o melhor horário de partida levando em conta as paradas programadas.
            </p>
            <ul className="text-xs text-blue-800 space-y-2 list-disc pl-5 font-medium leading-relaxed">
              <li><strong>Origem:</strong> Endereço de partida ou localização atual.</li>
              <li><strong>Destino:</strong> Porto de chegada escolhido.</li>
              <li><strong>Data e horário:</strong> Quando você precisa estar no porto.</li>
              <li><strong>Paradas:</strong> Selecione o intervalo e a duração das paradas; o app ajusta o horário de saída automaticamente.</li>
            </ul>
          </div>
        )}

        {/* Booking Form Card */}
        {step === 1 && (
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

            <div className="relative">
              <input
                type="text"
                value={origin}
                onChange={(e) => handleOriginChange(e.target.value)}
                onFocus={() => { if (originSuggestions.length > 0) setShowOriginSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs text-slate-700 font-medium focus:outline-none focus:bg-white focus:border-blue-900 transition"
                placeholder="Digite cidade, estado ou endereço"
              />
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 shadow-md rounded-xl max-h-48 overflow-y-auto">
                  {originSuggestions.map((sug, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => selectOriginSuggestion(sug)}
                      className="px-3 py-2 text-[10px] text-slate-600 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <MapPin className="w-3 h-3 inline-block mr-1 text-slate-400" /> {sug.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
            <div className="relative">
              <input
                type="text"
                value={destination}
                onChange={(e) => handleDestChange(e.target.value)}
                onFocus={handleDestFocus}
                onClick={handleDestFocus}
                onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-3.5 text-xs text-slate-700 font-medium focus:outline-none focus:bg-white focus:border-blue-900 transition"
                placeholder="Digite ou selecione o porto de chegada"
              />
              {showDestSuggestions && destSuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-100 shadow-md rounded-xl max-h-48 overflow-y-auto">
                  {destSuggestions.map((port, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectDestSuggestion(port)}
                      className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
                    >
                      <MapPin className="w-3 h-3 inline-block mr-1 text-red-400" /> {port}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>



          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                DATA DE CHEGADA
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
                HORÁRIO DE CHEGADA
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
          
          <button
            onClick={() => {
               if (!origin.trim() || !destination.trim() || !date.trim() || !time.trim()) {
                 setError("Por favor, preencha todos os campos antes de avançar.");
                 return;
               }
               setError("");
               setStep(2);
            }}
            className="w-full bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase mt-4 cursor-pointer"
          >
            AVANÇAR <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        )}

        {/* Route Preferences Section */}
        {step === 2 && (
          <>
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-700">Ritmo de paradas</p>
              </div>

              {/* Stop Interval Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Frequência de Descanso
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
            {/* Stop Duration Selector (moved here as requested) */}
            <div className="mt-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Duração padrão por parada</label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setStopDurationMinutes(v)}
                    className={`py-2 px-1 rounded-xl border text-center transition flex items-center justify-center cursor-pointer ${stopDurationMinutes === v ? "bg-blue-950 border-blue-950 text-white shadow-xs" : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100/60"}`}
                  >
                    <span className="text-[12px] font-extrabold">{v}m</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Você pode editar a duração de cada parada individualmente após gerar a rota.</p>
            </div>
          </div>

          {/* Facility Checkboxes */}
          <div className="space-y-3 pt-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Serviços Desejados
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  id: "shower",
                  label: "BANHO",
                  checked: requiresShower,
                  onChange: setRequiresShower,
                  icon: "🚿",
                },
                {
                  id: "meal",
                  label: "REFEIÇÃO",
                  checked: requiresMeal,
                  onChange: setRequiresMeal,
                  icon: "🍛",
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
        <div className="flex justify-between gap-3">
          <button
            onClick={() => setStep(1)}
            className="bg-white text-blue-950 border border-slate-200 hover:bg-slate-50 font-bold py-3.5 px-6 rounded-xl shadow-xs text-xs transition uppercase cursor-pointer"
          >
            VOLTAR
          </button>
          <button
            onClick={handleConfirm}
            disabled={geocoding}
            className="bg-blue-950 hover:bg-blue-900 active:scale-98 text-white font-bold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 tracking-wider text-xs transition uppercase disabled:opacity-50 cursor-pointer"
          >
            {geocoding ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> {loadingLabel}
              </>
            ) : (
              <>
                CONFIRMAR <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
        </>
        )}

        {/* Cancel Appointments Section */}
        {appointments.length > 0 && step === 1 && (
          <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs mt-4">
            <h3 className="text-[11px] font-bold text-red-600 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Gerenciar Agendamentos
            </h3>
            <div className="space-y-3">
              {appointments.map((app, index) => (
                <div 
                  key={index} 
                  onClick={() => onSelectAppointment && onSelectAppointment(index)}
                  className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <h4 className="text-xs font-black text-slate-800 truncate">
                      {formatAddress(app.origin, "Origem")} → {formatAddress(app.destination, "Destino")}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" /> {app.date} às {app.time}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAppointmentToDelete(index);
                    }}
                    className="flex-shrink-0 bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors border border-red-100 cursor-pointer"
                    title="Cancelar agendamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {appointmentToDelete !== null && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-widest mb-2">Excluir Agendamento?</h3>
              <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                Tem certeza que deseja cancelar esta viagem? Esta ação não poderá ser desfeita.
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setAppointmentToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl shadow-xs text-xs transition uppercase cursor-pointer"
                >
                  VOLTAR
                </button>
                <button
                  onClick={() => {
                    if (onDeleteAppointment) onDeleteAppointment(appointmentToDelete);
                    setAppointmentToDelete(null);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition uppercase cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> EXCLUIR
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Reusable Tab Navigation Bar */}
      <BottomNavigation activeTab="agendar" onNavigate={onNavigate} />
    </div>
  );
}
