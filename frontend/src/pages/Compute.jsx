import React, { useEffect, useState, useMemo } from "react";
import {
  Server,
  Search,
  ArrowUpDown,
  Cpu,
  Layers,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useCloud } from "../context/CloudContext";
import { api } from "../api";

const PROVIDER_COLORS = {
  aws: "#FF9900",
  azure: "#0089D6",
  gcp: "#34A853",
};

export default function Compute() {
  const { provider, refreshKey } = useCloud();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("cpu_percent");
  const [sortAsc, setSortAsc] = useState(false);
  const [stateFilter, setStateFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    async function loadCompute() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getCompute(provider);
        if (isMounted) setInstances(data);
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load compute resources");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCompute();
    return () => {
      isMounted = false;
    };
  }, [provider, refreshKey]);

  // Average CPU per provider for bar chart
  const avgCpuData = useMemo(() => {
    const stats = {
      aws: { total: 0, count: 0 },
      azure: { total: 0, count: 0 },
      gcp: { total: 0, count: 0 },
    };
    instances.forEach((inst) => {
      if (inst.state === "running" && stats[inst.provider]) {
        stats[inst.provider].total += inst.cpu_percent;
        stats[inst.provider].count += 1;
      }
    });

    return [
      {
        provider: "AWS",
        avgCpu: stats.aws.count > 0 ? Number((stats.aws.total / stats.aws.count).toFixed(1)) : 0,
        color: PROVIDER_COLORS.aws,
      },
      {
        provider: "Azure",
        avgCpu: stats.azure.count > 0 ? Number((stats.azure.total / stats.azure.count).toFixed(1)) : 0,
        color: PROVIDER_COLORS.azure,
      },
      {
        provider: "GCP",
        avgCpu: stats.gcp.count > 0 ? Number((stats.gcp.total / stats.gcp.count).toFixed(1)) : 0,
        color: PROVIDER_COLORS.gcp,
      },
    ];
  }, [instances]);

  // Filter and sort instances
  const filteredInstances = useMemo(() => {
    return instances
      .filter((inst) => {
        const matchesSearch =
          inst.name.toLowerCase().includes(search.toLowerCase()) ||
          inst.id.toLowerCase().includes(search.toLowerCase()) ||
          inst.region.toLowerCase().includes(search.toLowerCase()) ||
          inst.type.toLowerCase().includes(search.toLowerCase());
        const matchesState = stateFilter === "all" || inst.state === stateFilter;
        return matchesSearch && matchesState;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [instances, search, stateFilter, sortField, sortAsc]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Server className="w-6 h-6 text-indigo-400" />
            Compute Fleet Telemetry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time monitoring across AWS EC2, Azure Virtual Machines, and GCP Compute Engine.
          </p>
        </div>
      </div>

      {/* Average CPU per Provider Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Average CPU Utilization by Cloud Provider</h2>
            <p className="text-xs text-slate-400">Running instances benchmark</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avgCpuData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="provider" stroke="#64748b" tick={{ fill: "#94a3b8" }} />
              <Tooltip
                formatter={(val) => [`${val}%`, "Average CPU"]}
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
              />
              <Bar dataKey="avgCpu" radius={[0, 6, 6, 0]}>
                {avgCpuData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Controls: Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by instance ID, name, region, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">State:</span>
          {["all", "running", "stopped", "terminated"].map((s) => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                stateFilter === s
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Instances Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Instance Details</th>
                <th className="py-3.5 px-4 font-semibold">Provider</th>
                <th className="py-3.5 px-4 font-semibold">Region & Type</th>
                <th
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-slate-100"
                  onClick={() => toggleSort("state")}
                >
                  <div className="flex items-center gap-1">
                    State <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-slate-100 w-44"
                  onClick={() => toggleSort("cpu_percent")}
                >
                  <div className="flex items-center gap-1">
                    CPU % <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 font-semibold cursor-pointer hover:text-slate-100 w-44"
                  onClick={() => toggleSort("memory_percent")}
                >
                  <div className="flex items-center gap-1">
                    Memory % <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading compute instances...
                  </td>
                </tr>
              ) : filteredInstances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No instances matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredInstances.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Instance ID & Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white font-sans text-sm">{inst.name}</div>
                      <div className="text-slate-400 text-[11px]">{inst.id}</div>
                    </td>

                    {/* Provider Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: PROVIDER_COLORS[inst.provider.toLowerCase()] }}
                      >
                        {inst.provider}
                      </span>
                    </td>

                    {/* Region & Type */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{inst.region}</div>
                      <div className="text-[11px] text-slate-400 font-sans">{inst.type}</div>
                    </td>

                    {/* State Badge */}
                    <td className="py-3.5 px-4">
                      {inst.state === "running" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> running
                        </span>
                      ) : inst.state === "stopped" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <AlertCircle className="w-3 h-3" /> stopped
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/40 text-slate-400 border border-slate-700">
                          <XCircle className="w-3 h-3" /> terminated
                        </span>
                      )}
                    </td>

                    {/* CPU Progress Bar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-between mb-1 text-[11px]">
                        <span
                          className={`font-semibold ${
                            inst.cpu_percent >= 90
                              ? "text-red-400 font-bold"
                              : inst.cpu_percent >= 75
                              ? "text-amber-400"
                              : "text-slate-200"
                          }`}
                        >
                          {inst.cpu_percent}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            inst.cpu_percent >= 90
                              ? "bg-red-500"
                              : inst.cpu_percent >= 75
                              ? "bg-amber-500"
                              : "bg-indigo-500"
                          }`}
                          style={{ width: `${Math.min(100, inst.cpu_percent)}%` }}
                        ></div>
                      </div>
                    </td>

                    {/* Memory Progress Bar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-between mb-1 text-[11px]">
                        <span className="text-slate-200 font-semibold">{inst.memory_percent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, inst.memory_percent)}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
