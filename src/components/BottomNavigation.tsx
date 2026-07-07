import React from "react";
import { Calendar, RefreshCw, AlertTriangle, UserCircle2, Anchor } from "lucide-react";
import { ScreenId } from "../types";

interface BottomNavigationProps {
  activeTab: "agendar" | "trajeto" | "transito" | "portos" | "conta";
  onNavigate: (screen: ScreenId) => void;
}

export default function BottomNavigation({ activeTab, onNavigate }: BottomNavigationProps) {
  const tabs = [
    {
      id: "trajeto" as const,
      label: "MEUS TRAJETOS",
      icon: RefreshCw, // elegant route loop icon like the original mockup
      screen: ScreenId.RouteOverview,
    },
    {
      id: "transito" as const,
      label: "ALERTAS",
      icon: AlertTriangle, // traffic signal/warning icon
      screen: ScreenId.EmitAlert,
    },
    {
      id: "portos" as const,
      label: "PORTOS",
      icon: Anchor,
      screen: ScreenId.Ports,
    },
    {
      id: "conta" as const,
      label: "CONTA",
      icon: UserCircle2,
      screen: ScreenId.MyAccount,
    },
  ];

  return (
    <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-2 flex justify-between items-center z-40 shadow-lg">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.screen)}
            className="flex flex-col items-center justify-center flex-1 py-1 px-2 gap-1 group transition"
          >
            <div
              className={`p-1 rounded-lg transition-transform duration-200 group-active:scale-90 ${
                isActive ? "text-blue-900 scale-110" : "text-slate-400 group-hover:text-slate-600"
              }`}
            >
              <IconComponent className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[9px] tracking-wide font-black transition-colors ${
                isActive ? "text-blue-900 font-extrabold" : "text-slate-400 font-semibold"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
