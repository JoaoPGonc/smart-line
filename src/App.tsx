/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ScreenId, Appointment, TrafficAlert } from "./types";
import LoginScreen from "./components/LoginScreen";
import WhoWeAreScreen from "./components/WhoWeAreScreen";
import ScheduleScreen from "./components/ScheduleScreen";
import ScheduleConfirmedScreen from "./components/ScheduleConfirmedScreen";

import ViewRouteMapScreen from "./components/ViewRouteMapScreen";
import RouteOverviewScreen from "./components/RouteOverviewScreen";
import ActiveRouteScreen from "./components/ActiveRouteScreen";
import TransitCenterScreen from "./components/TransitCenterScreen";
import EmitAlertScreen from "./components/EmitAlertScreen";
import AlertSuccessScreen from "./components/AlertSuccessScreen";
import MyAccountScreen from "./components/MyAccountScreen";
import ForgotPasswordScreen from "./components/ForgotPasswordScreen";
import RegisterScreen from "./components/RegisterScreen";
import TermsOfUseScreen from "./components/TermsOfUseScreen";
import PortsScreen from "./components/PortsScreen";
import { ArrowLeft, RefreshCw, Anchor } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { deletePortAppointment } from "./utils/portQueueService";

// Initial set of alerts in the system is empty by default to not invent alerts
const initialAlerts: TrafficAlert[] = [];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(ScreenId.Login);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [history, setHistory] = useState<ScreenId[]>([ScreenId.Login]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [liveTime, setLiveTime] = useState<string>("15:01");

  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointmentIndex, setSelectedAppointmentIndex] = useState<number | null>(null);

  const activeIndex = selectedAppointmentIndex !== null && selectedAppointmentIndex < appointments.length
    ? selectedAppointmentIndex
    : appointments.length > 0 ? appointments.length - 1 : null;

  const appointment = activeIndex !== null ? appointments[activeIndex] : null;

  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return localStorage.getItem("is_demo") === "true";
  });

  // Track checked states for the 3 support stopovers on Screen 7
  const [checkedStops, setCheckedStops] = useState<boolean[]>([false, false, false]);

  // Traffic Alerts list state - Persist dynamically via localStorage so none are pre-invented if none were sent
  const [alerts, setAlerts] = useState<TrafficAlert[]>(() => {
    try {
      const saved = localStorage.getItem("trucker_traffic_alerts");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Persist alerts to localStorage when updated
  useEffect(() => {
    localStorage.setItem("trucker_traffic_alerts", JSON.stringify(alerts));
  }, [alerts]);

  // 1. Listen to Auth State and Fetch from Firestore
  useEffect(() => {
    if (isDemo) {
      setAuthLoading(false);
      const savedAppointments = localStorage.getItem("last_appointments");
      const savedOrigin = localStorage.getItem("last_origin_coords");
      const savedDest = localStorage.getItem("last_dest_coords");
      const savedIndex = localStorage.getItem("selected_appointment_index");
      
      if (savedAppointments) {
        try { setAppointments(JSON.parse(savedAppointments)); } catch(e) {}
      }
      if (savedIndex) {
        try { setSelectedAppointmentIndex(Number(savedIndex)); } catch(e) {}
      }
      if (savedOrigin) {
        try { setOriginCoords(JSON.parse(savedOrigin)); } catch(e) {}
      }
      if (savedDest) {
        try { setDestCoords(JSON.parse(savedDest)); } catch(e) {}
      }

      setCurrentScreen((prev) => {
        if ([ScreenId.Login, ScreenId.Register, ScreenId.ForgotPassword].includes(prev)) {
          return ScreenId.Schedule;
        }
        return prev;
      });
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        localStorage.setItem("smartline_logged_in", "true");
        
        // Pre-load from localStorage for offline support
        const savedAppointments = localStorage.getItem("last_appointments");
        const savedOrigin = localStorage.getItem("last_origin_coords");
        const savedDest = localStorage.getItem("last_dest_coords");
        const savedIndex = localStorage.getItem("selected_appointment_index");
        
        if (savedAppointments) {
          try { setAppointments(JSON.parse(savedAppointments)); } catch(e) {}
        }
        if (savedIndex) {
          try { setSelectedAppointmentIndex(Number(savedIndex)); } catch(e) {}
        }
        if (savedOrigin) {
          try { setOriginCoords(JSON.parse(savedOrigin)); } catch(e) {}
        }
        if (savedDest) {
          try { setDestCoords(JSON.parse(savedDest)); } catch(e) {}
        }

        let profileExists = false;
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            profileExists = true;
            const data = userDoc.data();
            
            // Update the user's name to match their Google account name
            if (user.displayName && data.name !== user.displayName) {
              await setDoc(doc(db, "users", user.uid), { name: user.displayName }, { merge: true });
            }

            if (data.appointments !== undefined) setAppointments(data.appointments || []);
            if (data.selectedAppointmentIndex !== undefined) setSelectedAppointmentIndex(data.selectedAppointmentIndex);
            if (data.lastOriginCoords !== undefined) setOriginCoords(data.lastOriginCoords);
            if (data.lastDestCoords !== undefined) setDestCoords(data.lastDestCoords);
          } else {
            // Auto-create a default profile in Firestore on Google Sign-In
            await setDoc(doc(db, "users", user.uid), {
              uid: user.uid,
              name: user.displayName || "Motorista",
              email: user.email || "",
              cpf: "Não cadastrado",
              plate: "Não cadastrado",
              company: "Não cadastrado",
              createdAt: new Date().toISOString()
            }, { merge: true });
            profileExists = true;
          }
        } catch (e) {
          console.warn("Could not load from Firestore, using offline data:", e);
          // Don't call handleFirestoreError here as it throws and breaks the offline fallback flow.
        }
        
        // Redirect landing screens appropriately
        setCurrentScreen((prev) => {
          if ([ScreenId.Login, ScreenId.Register, ScreenId.ForgotPassword].includes(prev)) {
            if (!profileExists) {
              return ScreenId.Register;
            }
            return ScreenId.Schedule;
          }
          return prev;
        });
      } else {
        // Logged out: clear states so that next user starts with clean empty fields
        setAppointments([]);
        setSelectedAppointmentIndex(null);
        setOriginCoords(null);
        setDestCoords(null);
        if (!isDemo) {
          setCurrentScreen(ScreenId.Login);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isDemo]);

  // 2. Sync State Changes back to Firestore & LocalStorage
  useEffect(() => {
    const user = auth.currentUser;
    if (user && !isDemo) {
      setDoc(doc(db, "users", user.uid), {
        appointments: appointments,
        selectedAppointmentIndex: selectedAppointmentIndex,
      }, { merge: true }).catch((e) => {
        console.error("Error syncing to Firestore:", e);
        handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
      });
    }
    
    if (appointments && appointments.length > 0) {
      localStorage.setItem("last_appointments", JSON.stringify(appointments));
    } else {
      localStorage.removeItem("last_appointments");
    }

    if (selectedAppointmentIndex !== null) {
      localStorage.setItem("selected_appointment_index", String(selectedAppointmentIndex));
    } else {
      localStorage.removeItem("selected_appointment_index");
    }
  }, [appointments, selectedAppointmentIndex, isDemo]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user && !isDemo) {
      setDoc(doc(db, "users", user.uid), {
        lastOriginCoords: originCoords
      }, { merge: true }).catch((e) => {
        console.error("Error syncing to Firestore:", e);
        handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
      });
    }
    if (originCoords) {
      localStorage.setItem("last_origin_coords", JSON.stringify(originCoords));
    } else {
      localStorage.removeItem("last_origin_coords");
    }
  }, [originCoords, isDemo]);

  useEffect(() => {
    const user = auth.currentUser;
    if (user && !isDemo) {
      setDoc(doc(db, "users", user.uid), {
        lastDestCoords: destCoords
      }, { merge: true }).catch((e) => {
        console.error("Error syncing to Firestore:", e);
        handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
      });
    }
    if (destCoords) {
      localStorage.setItem("last_dest_coords", JSON.stringify(destCoords));
    } else {
      localStorage.removeItem("last_dest_coords");
    }
  }, [destCoords, isDemo]);

  // Update live clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setLiveTime(`${hours}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize checkedStops length and states with the active appointment
  useEffect(() => {
    if (appointment && appointment.customStops) {
      setCheckedStops(new Array(appointment.customStops.length).fill(false));
    } else {
      setCheckedStops([false, false, false]);
    }
  }, [appointment?.id, appointment?.customStops?.length]);

  // Safe navigation function tracking transitions
  const navigateTo = (screen: ScreenId) => {
    setCurrentScreen(screen);
    setHistory((prev) => [...prev, screen]);
  };

  // Back button functionality
  const handleBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // remove current
      const last = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentScreen(last);
    } else {
      // Fallback
      setCurrentScreen(ScreenId.Login);
    }
  };

  // Callback to append a new alert dynamically
  const handleAddAlert = (newAlert: TrafficAlert) => {
    setAlerts((prev) => [newAlert, ...prev]);
  };

  // Toggle checklist for stopovers
  const handleToggleStop = (index: number) => {
    setCheckedStops((prev) => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  // Render the current screen
  const renderScreen = () => {
    if (authLoading && localStorage.getItem("smartline_logged_in") === "true") {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-blue-950 text-white p-8 space-y-4">
          <div className="bg-white/10 p-4 rounded-full text-white shadow-xl mb-2 animate-pulse">
            <Anchor className="w-12 h-12" />
          </div>
          <h2 className="text-lg font-black tracking-widest text-center uppercase">
            SMART LINE
          </h2>
          <div className="flex items-center gap-2 text-xs text-blue-200 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Restaurando sessão segura...</span>
          </div>
        </div>
      );
    }

    switch (currentScreen) {
      case ScreenId.Login:
        return (
          <LoginScreen
            onNavigate={navigateTo}
            onLoginDemo={() => {
              setIsDemo(true);
              localStorage.setItem("is_demo", "true");
              navigateTo(ScreenId.Schedule);
            }}
          />
        );
      case ScreenId.WhoWeAre:
        return <WhoWeAreScreen onNavigate={navigateTo} previousScreen={history[history.length - 2] || ScreenId.Login} />;
      case ScreenId.Schedule:
        return (
          <ScheduleScreen
            onNavigate={navigateTo}
            onSetAppointment={(newApp) => {
              if (newApp) {
                setAppointments((prev) => {
                  const updated = [...prev, newApp];
                  setSelectedAppointmentIndex(updated.length - 1);
                  return updated;
                });
              } else {
                setAppointments([]);
                setSelectedAppointmentIndex(null);
              }
            }}
            onDeleteAppointment={(indexToRemove) => {
              const appToRemove = appointments[indexToRemove];
              if (appToRemove && appToRemove.portAppointmentId) {
                deletePortAppointment(appToRemove.portAppointmentId).catch(console.error);
              }
              
              setAppointments((prev) => {
                const updated = prev.filter((_, idx) => idx !== indexToRemove);
                if (updated.length === 0) {
                  setSelectedAppointmentIndex(null);
                } else if (selectedAppointmentIndex === indexToRemove) {
                  setSelectedAppointmentIndex(updated.length - 1);
                } else if (selectedAppointmentIndex !== null && selectedAppointmentIndex > indexToRemove) {
                  setSelectedAppointmentIndex(selectedAppointmentIndex - 1);
                }
                return updated;
              });
            }}
            originCoords={originCoords}
            destCoords={destCoords}
            onSetOriginCoords={setOriginCoords}
            onSetDestCoords={setDestCoords}
            appointments={appointments}
          />
        );
      case ScreenId.ScheduleConfirmed:
        return (
          <ScheduleConfirmedScreen
            onNavigate={navigateTo}
            appointment={appointment}
            originCoords={originCoords}
            destCoords={destCoords}
          />
        );
      case ScreenId.ViewRouteMap:
        return (
          <ViewRouteMapScreen
            onNavigate={navigateTo}
            originCoords={originCoords}
            destCoords={destCoords}
            appointment={appointment}
          />
        );
      case ScreenId.RouteOverview:
        return (
          <RouteOverviewScreen
            onNavigate={navigateTo}
            checkedStops={checkedStops}
            onToggleStop={handleToggleStop}
            appointments={appointments}
            selectedAppointmentIndex={selectedAppointmentIndex}
            onSelectAppointmentIndex={setSelectedAppointmentIndex}
          />
        );
      case ScreenId.ActiveRoute:
        return (
          <ActiveRouteScreen
            onNavigate={navigateTo}
            appointment={appointment}
            originCoords={originCoords}
            destCoords={destCoords}
            checkedStops={checkedStops}
          />
        );
      case ScreenId.Ports:
        return <PortsScreen onNavigate={navigateTo} />;
      case ScreenId.EmitAlert:
        return <EmitAlertScreen onNavigate={navigateTo} onAddAlert={handleAddAlert} />;
      case ScreenId.AlertSuccess:
        return <AlertSuccessScreen onNavigate={navigateTo} />;
      case ScreenId.MyAccount:
        return (
          <MyAccountScreen
            onNavigate={navigateTo}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            onLogout={async () => {
              setIsDemo(false);
              localStorage.removeItem("is_demo");
              localStorage.setItem("smartline_logged_in", "false");
              try {
                await auth.signOut();
              } catch (e) {
                console.error("Error signing out:", e);
              }
              setAppointments([]);
              setSelectedAppointmentIndex(null);
              setOriginCoords(null);
              setDestCoords(null);
              navigateTo(ScreenId.Login);
            }}
            appointments={appointments}
          />
        );
      case ScreenId.ForgotPassword:
        return <ForgotPasswordScreen onNavigate={navigateTo} />;
      case ScreenId.Register:
        return <RegisterScreen onNavigate={navigateTo} />;
      case ScreenId.TermsOfUse:
        return <TermsOfUseScreen onNavigate={navigateTo} />;
      default:
        return (
          <LoginScreen
            onNavigate={navigateTo}
            onLoginDemo={() => {
              setIsDemo(true);
              localStorage.setItem("is_demo", "true");
              localStorage.setItem("smartline_logged_in", "true");
              navigateTo(ScreenId.Schedule);
            }}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-0 md:p-6 transition-colors duration-300 ${
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-800"
    }`}>
      
      {/* Smartphone frame container */}
      <div className={`relative w-full max-w-md h-screen md:h-[840px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border transition-all duration-300 ${
        isDarkMode 
          ? "bg-slate-950 border-slate-800 shadow-blue-950/20" 
          : "bg-white border-slate-200/80 shadow-slate-300/60"
      }`}>

        {/* Interactive Screen viewport */}
        <div className={`flex-1 relative overflow-hidden bg-slate-50 ${isDarkMode ? "dark-mode-container" : ""}`}>
          {renderScreen()}
        </div>

        {/* Mock Device physical home bar on desktop */}
        <div className="hidden md:block py-2 text-center bg-transparent relative z-40">
          <div className="w-28 h-1 bg-slate-400/50 rounded-full mx-auto"></div>
        </div>
      </div>

      {/* Floating Interactive Guide Panel on desktop layouts */}
      <div className="hidden xl:flex flex-col gap-4 max-w-xs ml-8 bg-white p-5 rounded-3xl border border-slate-200 shadow-lg text-slate-800">
        <div className="flex items-center gap-2 text-blue-950">
          <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: "10s" }} />
          <h3 className="font-extrabold text-sm tracking-wide uppercase">Roteador de Protótipo</h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Navegue pelas 12 telas diretamente clicando nos botões correspondentes do aplicativo à esquerda, ou use os atalhos rápidos abaixo para pular para qualquer tela instantaneamente:
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {[
            { id: ScreenId.Login, label: "1. Login" },
            { id: ScreenId.WhoWeAre, label: "2. Quem Somos" },
            { id: ScreenId.Schedule, label: "3. Agendar" },
            { id: ScreenId.ScheduleConfirmed, label: "4. Confirmação" },
            { id: ScreenId.ViewRouteMap, label: "6. Mapa Rota" },
            { id: ScreenId.RouteOverview, label: "7. Trajeto" },
            { id: ScreenId.ActiveRoute, label: "8. Rota Ativa" },
            { id: ScreenId.TransitCenter, label: "9. Trânsito" },
            { id: ScreenId.EmitAlert, label: "10. Novo Alerta" },
            { id: ScreenId.AlertSuccess, label: "11. Env. Sucesso" },
            { id: ScreenId.MyAccount, label: "12. Conta" },
            { id: ScreenId.TermsOfUse, label: "13. Termos" },
            { id: ScreenId.Ports, label: "14. Portos" },
          ].map((screen) => (
            <button
              key={screen.id}
              onClick={() => {
                setCurrentScreen(screen.id);
                setHistory((prev) => [...prev, screen.id]);
              }}
              className={`text-[10px] font-bold py-1.5 px-2.5 rounded-lg border text-left transition ${
                currentScreen === screen.id
                  ? "bg-blue-950 border-blue-950 text-white shadow-xs"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
              }`}
            >
              {screen.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
