import React, { useEffect, useState } from "react";
import {
  Server,
  DollarSign,
  HardDrive,
  Activity,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { useCloud } from "../context/CloudContext";
import { api } from "../api";
import { Link } from "react-router-dom";

const PROVIDER_COLORS = {
  aws: "#FF9900",
  azure: "#0089D6",
  gcp: "#34A853",
};

export default function Overview() {
  const { provider, refreshKey, incidentActive, simulateIncident, resetIncident, incidentLoading } = useCloud();
  const [kpis, setKpis] = useState(null);
  const [costs, setCosts] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [kpiRes, costRes, alertRes] = await Promise.all([
          api.getOverview(provider),
          api.getCosts(provider, 30),
          api.getAlerts(provider),
        ]);
        if (isMounted) {
          setKpis(kpiRes);
          setCosts(costRes);
          setAlerts(alertRes.slice(0, 5)); // Top 5 alerts for feed
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load overview data");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [provider, refreshKey]);

  if (loading && !kpis) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Aggregating multi-cloud metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200">
          <p className="font-semibold text-red-400">Failed to load overview telemetry</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Cost by provider donut data
  const donutData = costs?.provider_costs
    ? [
        { name: "AWS", value: costs.provider_costs.aws || 0, color: PROVIDER_COLORS.aws },
        { name: "Azure", value: costs.provider_costs.azure || 0, color: PROVIDER_COLORS.azure },
        { name: "GCP", value: costs.provider_costs.gcp || 0, color: PROVIDER_COLORS.gcp },
      ].filter((d) => d.value > 0)
    : [];

  // Line chart daily cost points (downsampled to 15 points for readability)
  const lineData = costs?.daily_costs
    ? costs.daily_costs.filter((_, idx) => idx % 2 === 0 || idx === costs.daily_costs.length - 1)
    : [];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Incident Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Multi-Cloud Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time infrastructure health, compute fleets, and cost telemetry across AWS, Azure & GCP.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {incidentActive ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                SIMULATED OUTAGE ACTIVE
              </span>
              <button
                onClick={() => resetIncident()}
                disabled={incidentLoading}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {incidentLoading ? "Restoring..." : "Restore Health"}
              </button>
            </div>
          ) : (
            <button
              id="simulate-incident-main-btn"
              onClick={() => simulateIncident()}
              disabled={incidentLoading}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/30 flex items-center gap-2 group"
            >
              <Flame className="w-4 h-4 text-amber-200 group-hover:scale-110 transition-transform" />
              <span>{incidentLoading ? "Simulating..." : "Simulate Incident (Demo)"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Compute Instances */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Compute</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white">{kpis?.total_instances ?? "--"}</span>
            <span className="text-xs text-slate-400 ml-2">instances</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
            {kpis?.running_instances ?? "--"} active running
          </div>
        </div>

        {/* KPI 2: Total Monthly Spend */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Monthly Spend</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white">
              ${kpis?.total_monthly_cost ? kpis.total_monthly_cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "--"}
            </span>
          </div>
          <div className="mt-2 text-xs flex items-center">
            {kpis?.cost_change_percent >= 0 ? (
              <span className="text-amber-400 flex items-center font-medium">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{kpis?.cost_change_percent}% vs last mo
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center font-medium">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {kpis?.cost_change_percent}% vs last mo
              </span>
            )}
          </div>
        </div>

        {/* KPI 3: Storage Used % */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Storage Capacity</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white">{kpis?.storage_used_percent ?? "--"}%</span>
            <span className="text-xs text-slate-400 ml-2">utilized</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {(kpis?.storage_used_gb ? kpis.storage_used_gb / 1000 : 0).toFixed(1)} TB of{" "}
            {(kpis?.storage_provisioned_gb ? kpis.storage_provisioned_gb / 1000 : 0).toFixed(1)} TB
          </div>
        </div>

        {/* KPI 4: Avg Network Latency */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Avg Latency</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white">{kpis?.avg_latency_ms ?? "--"}</span>
            <span className="text-xs text-slate-400 ml-1.5">ms RTT</span>
          </div>
          <div className="mt-2 text-xs font-medium text-slate-400">
            {kpis?.avg_latency_ms < 50 ? (
              <span className="text-emerald-400">Optimal global routing</span>
            ) : (
              <span className="text-amber-400">Elevated regional latency</span>
            )}
          </div>
        </div>

        {/* KPI 5: Service Health % */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Service Health</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-white">{kpis?.healthy_service_percent ?? "--"}%</span>
            <span className="text-xs text-slate-400 ml-1.5">nominal</span>
          </div>
          <div className="mt-2 text-xs">
            {kpis?.healthy_service_percent === 100 ? (
              <span className="text-emerald-400 font-medium">All cloud services healthy</span>
            ) : (
              <span className="text-red-400 font-medium animate-pulse">Outages / degraded detected</span>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Charts: Donut + Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cost by Provider Donut (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Cost by Provider</h2>
              <span className="text-xs text-slate-400">Monthly</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Multi-cloud spend distribution</p>
          </div>

          <div className="h-56 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`$${Number(val).toLocaleString()}`, "Spend"]}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
            {donutData.map((d) => (
              <div key={d.name} className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                  <span>{d.name}</span>
                </div>
                <div className="font-semibold text-xs text-white mt-1">
                  ${d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 30-Day Cost Trend (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">30-Day Cost Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">Daily multi-cloud run rate</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-[#FF9900]"></span> AWS
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-[#0089D6]"></span> Azure
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-[#34A853]"></span> GCP
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  formatter={(val, name) => [`$${Number(val).toFixed(2)}`, name.toUpperCase()]}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                />
                <Line type="monotone" dataKey="aws" stroke="#FF9900" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="azure" stroke="#0089D6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="gcp" stroke="#34A853" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live Alerts Feed & Cloud Status */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Live Intelligence & Alerts Feed</h2>
          </div>
          <Link
            to="/alerts"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>View All Alerts ({kpis?.active_alerts_count || alerts.length})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/40 text-center text-slate-400 text-sm">
              All infrastructure metrics within defined policy thresholds.
            </div>
          ) : (
            alerts.map((alt) => (
              <div
                key={alt.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  alt.severity === "critical"
                    ? "bg-red-950/30 border-red-500/40 text-red-200"
                    : alt.severity === "warning"
                    ? "bg-amber-950/20 border-amber-500/40 text-amber-200"
                    : "bg-blue-950/20 border-blue-500/40 text-blue-200"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        alt.severity === "critical"
                          ? "bg-red-500 text-white"
                          : alt.severity === "warning"
                          ? "bg-amber-500 text-black"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {alt.severity}
                    </span>
                    {alt.provider && (
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: PROVIDER_COLORS[alt.provider.toLowerCase()] || "#64748b" }}
                      >
                        {alt.provider}
                      </span>
                    )}
                    <span className="font-semibold text-sm text-white">{alt.title}</span>
                  </div>
                  <p className="text-xs text-slate-300">{alt.message}</p>
                </div>
                <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                  {alt.timestamp}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
