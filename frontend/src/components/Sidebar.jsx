import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  HardDrive,
  Activity,
  DollarSign,
  HeartPulse,
  Bell,
  Cloud,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { useCloud } from "../context/CloudContext";

const navItems = [
  { name: "Overview", path: "/", icon: LayoutDashboard },
  { name: "Compute", path: "/compute", icon: Server },
  { name: "Storage", path: "/storage", icon: HardDrive },
  { name: "Network", path: "/network", icon: Activity },
  { name: "Costs", path: "/costs", icon: DollarSign },
  { name: "Health", path: "/health", icon: HeartPulse },
  { name: "Alerts", path: "/alerts", icon: Bell, hasBadge: true },
];

export default function Sidebar() {
  const { activeAlertCount, incidentActive } = useCloud();

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none">
      <div>
        {/* Brand header */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Cloud className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg text-white tracking-tight">CloudLens</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Multi-Cloud Intelligence</p>
            </div>
          </div>
        </div>

        {/* Incident Alert Callout if Active */}
        {incidentActive && (
          <div className="mx-4 mt-4 p-3 rounded-lg bg-red-950/60 border border-red-500/50 flex items-start space-x-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-200">
              <p className="font-semibold text-red-400">Simulated Incident Active</p>
              <p className="text-[11px] text-red-300/80">Check Alerts & Health pages</p>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                {item.hasBadge && activeAlertCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full animate-bounce">
                    {activeAlertCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Cloud Providers Status Footprint */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" /> Connected Clouds
          </span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF9900]"></span>
              AWS (us-east, us-west)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Boto3</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0089D6]"></span>
              Azure (eastus, weur)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">AzureMgmt</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34A853]"></span>
              GCP (us-cent, eu-w1)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">GoogleSDK</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
