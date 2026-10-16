import React from "react";
import {
  Sun,
  Moon,
  RotateCw,
  Clock,
  Flame,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useCloud } from "../context/CloudContext";

export default function Topbar() {
  const {
    provider,
    setProvider,
    theme,
    toggleTheme,
    lastRefreshed,
    countdown,
    triggerRefresh,
    incidentActive,
    simulateIncident,
    resetIncident,
    incidentLoading,
  } = useCloud();

  const providers = [
    { id: "all", label: "All Clouds", color: "bg-slate-700 text-slate-100", active: "bg-indigo-600 text-white" },
    { id: "aws", label: "AWS", color: "text-[#FF9900] hover:bg-amber-500/10", active: "bg-[#FF9900] text-black font-bold" },
    { id: "azure", label: "Azure", color: "text-[#0089D6] hover:bg-sky-500/10", active: "bg-[#0089D6] text-white font-bold" },
    { id: "gcp", label: "GCP", color: "text-[#34A853] hover:bg-emerald-500/10", active: "bg-[#34A853] text-white font-bold" },
  ];

  return (
    <header className="h-16 px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Multi-Cloud Provider Filter */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
          Filter:
        </span>
        <div className="flex items-center p-1 bg-slate-950/60 rounded-xl border border-slate-800 space-x-1">
          {providers.map((p) => {
            const isSelected = provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? p.active + " shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Status, Refresh & Controls */}
      <div className="flex items-center space-x-3">
        {/* Incident Trigger / Reset Button */}
        {incidentActive ? (
          <button
            onClick={() => resetIncident()}
            disabled={incidentLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30 text-xs font-semibold transition-all shadow-sm"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{incidentLoading ? "Restoring..." : "Resolve Incident"}</span>
          </button>
        ) : (
          <button
            id="simulate-incident-topbar-btn"
            onClick={() => simulateIncident()}
            disabled={incidentLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30 text-xs font-semibold transition-all shadow-sm hover:shadow-red-600/20"
          >
            <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>{incidentLoading ? "Simulating..." : "Simulate Incident"}</span>
          </button>
        )}

        {/* Refresh & Countdown */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Synced {lastRefreshed}</span>
          <span className="text-indigo-400 font-mono text-[11px] font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded">
            {countdown}s
          </span>
          <button
            onClick={triggerRefresh}
            title="Refresh now"
            className="text-slate-400 hover:text-white transition-colors ml-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all border border-slate-800 bg-slate-950/60"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>
      </div>
    </header>
  );
}
