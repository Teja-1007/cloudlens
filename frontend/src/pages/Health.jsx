import React, { useEffect, useState, useMemo } from "react";
import {
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  History,
  ShieldCheck,
} from "lucide-react";
import { useCloud } from "../context/CloudContext";
import { api } from "../api";

const PROVIDER_COLORS = {
  aws: "#FF9900",
  azure: "#0089D6",
  gcp: "#34A853",
};

export default function Health() {
  const { provider, refreshKey, incidentActive, incidentDetails } = useCloud();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    async function loadHealth() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getHealth(provider);
        if (isMounted) setServices(data);
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load service health");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadHealth();
    return () => {
      isMounted = false;
    };
  }, [provider, refreshKey]);

  // Categories
  const categories = ["all", "Compute", "Storage", "Database", "Networking"];

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      return categoryFilter === "all" || s.category.toLowerCase() === categoryFilter.toLowerCase();
    });
  }, [services, categoryFilter]);

  // Incident timeline entries
  const incidentTimeline = [
    ...(incidentActive && incidentDetails
      ? [
          {
            id: incidentDetails.id || "inc-active",
            title: `CRITICAL OUTAGE: ${incidentDetails.service}`,
            provider: incidentDetails.provider,
            time: incidentDetails.triggered_at || "Just now",
            status: "active",
            description: incidentDetails.description,
          },
        ]
      : []),
    {
      id: "inc-hist-1",
      title: "GCP Cloud Networking BGP Latency Anomaly",
      provider: "gcp",
      time: "2026-09-24 18:20 UTC",
      status: "resolved",
      description: "Automated routing failover mitigated elevated packet latency in europe-west1 within 8 minutes.",
    },
    {
      id: "inc-hist-2",
      title: "Azure AKS Managed Control Plane Maintenance",
      provider: "azure",
      time: "2026-09-21 02:00 UTC",
      status: "resolved",
      description: "Scheduled upstream Kubernetes patch rollout completed successfully with zero pod eviction.",
    },
    {
      id: "inc-hist-3",
      title: "AWS S3 Multi-AZ Metadata Latency Degradation",
      provider: "aws",
      time: "2026-09-17 11:45 UTC",
      status: "resolved",
      description: "Temporary throttling during metadata index re-partitioning resolved following capacity addition.",
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <HeartPulse className="w-6 h-6 text-emerald-400" />
          Cloud Service Health & SLA Matrix
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Live availability, response latency, and uptime compliance across core infrastructure endpoints.
        </p>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${
              categoryFilter === cat
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            {cat === "all" ? "All Services" : cat}
          </button>
        ))}
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading service health states...</div>
        ) : filteredServices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No services found for this filter.</div>
        ) : (
          filteredServices.map((svc, idx) => {
            const isUp = svc.status === "up";
            const isDegraded = svc.status === "degraded";
            const isDown = svc.status === "down";

            return (
              <div
                key={`${svc.provider}-${svc.service_name}-${idx}`}
                className={`p-5 rounded-2xl border transition-all ${
                  isDown
                    ? "bg-red-950/40 border-red-500/50 shadow-lg shadow-red-500/10 animate-pulse"
                    : isDegraded
                    ? "bg-amber-950/30 border-amber-500/40"
                    : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Top Row: Provider & Status Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: PROVIDER_COLORS[svc.provider.toLowerCase()] }}
                  >
                    {svc.provider}
                  </span>

                  {isUp && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                    </span>
                  )}
                  {isDegraded && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-3.5 h-3.5" /> Degraded
                    </span>
                  )}
                  {isDown && (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                      <XCircle className="w-3.5 h-3.5" /> Major Outage
                    </span>
                  )}
                </div>

                {/* Service Name & Category */}
                <div className="mt-3">
                  <h3 className="font-semibold text-white text-base leading-snug">{svc.service_name}</h3>
                  <span className="text-xs text-slate-400">{svc.category}</span>
                </div>

                {/* Telemetry Numbers */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Endpoint Latency</span>
                    <span className="font-mono font-semibold text-slate-200">{svc.latency_ms} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">30-Day SLA Uptime</span>
                    <span className="font-mono font-semibold text-emerald-400">{svc.uptime_percent}%</span>
                  </div>
                </div>

                {/* Status Message */}
                <div className="mt-3 text-xs text-slate-300 italic bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                  {svc.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Incident Timeline */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Multi-Cloud Incident & Postmortem Timeline</h2>
        </div>
        <div className="space-y-4 pt-2">
          {incidentTimeline.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-start justify-between gap-3 ${
                item.status === "active"
                  ? "bg-red-950/50 border-red-500/60 animate-pulse text-red-100"
                  : "bg-slate-950/60 border-slate-800 text-slate-300"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      item.status === "active"
                        ? "bg-red-500 text-white"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {item.status}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: PROVIDER_COLORS[item.provider.toLowerCase()] }}
                  >
                    {item.provider}
                  </span>
                  <h4 className="font-semibold text-sm text-white">{item.title}</h4>
                </div>
                <p className="text-xs text-slate-300 mt-1">{item.description}</p>
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {item.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
