import React, { useEffect, useState, useMemo } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  Filter,
} from "lucide-react";
import { useCloud } from "../context/CloudContext";
import { api } from "../api";

const PROVIDER_COLORS = {
  aws: "#FF9900",
  azure: "#0089D6",
  gcp: "#34A853",
};

export default function Alerts() {
  const { provider, refreshKey, triggerRefresh } = useCloud();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "acknowledged"
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAlerts(provider);
      setAlerts(data);
    } catch (err) {
      setError(err.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [provider, refreshKey]);

  const handleAcknowledge = async (id) => {
    setAcknowledgingId(id);
    try {
      await api.acknowledgeAlert(id);
      // Optimistic update
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
      triggerRefresh();
    } catch (err) {
      alert("Failed to acknowledge alert: " + err.message);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchSeverity = severityFilter === "all" || a.severity === severityFilter;
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? !a.acknowledged
          : a.acknowledged;
      return matchSeverity && matchStatus;
    });
  }, [alerts, severityFilter, statusFilter]);

  const activeCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-400" />
            Alert Management & Incident Rules
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time threshold breaches, capacity limits, service outages, and cost warnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {activeCount} Active Unacknowledged
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        {/* Severity Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Severity:</span>
          {["all", "critical", "warning", "info"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                severityFilter === sev
                  ? sev === "critical"
                    ? "bg-red-600 text-white"
                    : sev === "warning"
                    ? "bg-amber-600 text-white"
                    : "bg-indigo-600 text-white"
                  : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          {[
            { id: "all", label: "All" },
            { id: "active", label: "Active Only" },
            { id: "acknowledged", label: "Acknowledged" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === st.id
                  ? "bg-slate-700 text-white"
                  : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            Evaluating alerts...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
            No alerts match the selected criteria.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCrit = alert.severity === "critical";
            const isWarn = alert.severity === "warning";
            const isAck = alert.acknowledged;

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isAck
                    ? "bg-slate-900/30 border-slate-800/60 opacity-75"
                    : isCrit
                    ? "bg-red-950/30 border-red-500/50 shadow-md shadow-red-500/10"
                    : isWarn
                    ? "bg-amber-950/20 border-amber-500/40"
                    : "bg-slate-900/70 border-slate-800"
                }`}
              >
                {/* Left info */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isCrit
                          ? "bg-red-500 text-white"
                          : isWarn
                          ? "bg-amber-500 text-black"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {alert.severity}
                    </span>

                    {alert.provider && (
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: PROVIDER_COLORS[alert.provider.toLowerCase()] || "#64748b" }}
                      >
                        {alert.provider}
                      </span>
                    )}

                    {alert.service && (
                      <span className="text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {alert.service}
                      </span>
                    )}

                    <h3 className="font-semibold text-white text-base">{alert.title}</h3>
                  </div>

                  <p className="text-sm text-slate-300 max-w-3xl">{alert.message}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {alert.timestamp}
                    </span>
                    {alert.threshold !== null && alert.threshold !== undefined && (
                      <span>Threshold: {alert.threshold}</span>
                    )}
                    {alert.metric_value !== null && alert.metric_value !== undefined && (
                      <span>Current: {alert.metric_value}</span>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  {isAck ? (
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Acknowledged
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={acknowledgingId === alert.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/30 whitespace-nowrap"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {acknowledgingId === alert.id ? "Saving..." : "Acknowledge"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
