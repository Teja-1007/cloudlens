import React, { useEffect, useState, useMemo } from "react";
import { HardDrive, Database, Search } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useCloud } from "../context/CloudContext";
import { api } from "../api";

const PROVIDER_COLORS = {
  aws: "#FF9900",
  azure: "#0089D6",
  gcp: "#34A853",
};

export default function Storage() {
  const { provider, refreshKey } = useCloud();
  const [storageItems, setStorageItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;
    async function loadStorage() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getStorage(provider);
        if (isMounted) setStorageItems(data);
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load storage telemetry");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStorage();
    return () => {
      isMounted = false;
    };
  }, [provider, refreshKey]);

  // Aggregate used vs free per provider for stacked bar chart
  const stackedChartData = useMemo(() => {
    const agg = {
      AWS: { used: 0, free: 0 },
      Azure: { used: 0, free: 0 },
      GCP: { used: 0, free: 0 },
    };

    storageItems.forEach((item) => {
      const pKey = item.provider.toUpperCase();
      if (agg[pKey]) {
        agg[pKey].used += item.used_gb;
        agg[pKey].free += Math.max(0, item.provisioned_gb - item.used_gb);
      }
    });

    return [
      { provider: "AWS", usedGB: Math.round(agg.AWS.used), freeGB: Math.round(agg.AWS.free) },
      { provider: "Azure", usedGB: Math.round(agg.Azure.used), freeGB: Math.round(agg.Azure.free) },
      { provider: "GCP", usedGB: Math.round(agg.GCP.used), freeGB: Math.round(agg.GCP.free) },
    ];
  }, [storageItems]);

  const filteredItems = useMemo(() => {
    return storageItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.region.toLowerCase().includes(search.toLowerCase()) ||
        item.storage_class.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [storageItems, search, typeFilter]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <HardDrive className="w-6 h-6 text-indigo-400" />
          Multi-Cloud Storage & Block Disks
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Capacity, utilization, and tiered storage telemetry across AWS S3/EBS, Azure Blob/Managed Disks, and GCP Cloud Storage/Persistent Disks.
        </p>
      </div>

      {/* Used vs Available Stacked Bar Chart */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Provisioned vs Used Capacity (GB)</h2>
            <p className="text-xs text-slate-400">Total volume footprint across cloud environments</p>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="provider" stroke="#64748b" />
              <YAxis stroke="#64748b" tickFormatter={(v) => `${(v / 1000).toFixed(0)} TB`} />
              <Tooltip
                formatter={(val, name) => [`${Number(val).toLocaleString()} GB`, name === "usedGB" ? "Used" : "Free Provisioned"]}
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px" }} />
              <Bar dataKey="usedGB" name="Used Capacity" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="freeGB" name="Available Free" stackId="a" fill="#334155" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search bucket, disk, storage class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Type:</span>
          {["all", "bucket", "disk"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                typeFilter === t
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {t === "all" ? "All Storage" : t === "bucket" ? "Object Buckets" : "Block Disks"}
            </button>
          ))}
        </div>
      </div>

      {/* Storage Resources Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Resource Name</th>
                <th className="py-3.5 px-4 font-semibold">Cloud</th>
                <th className="py-3.5 px-4 font-semibold">Type</th>
                <th className="py-3.5 px-4 font-semibold">Region / Tier</th>
                <th className="py-3.5 px-4 font-semibold">Provisioned</th>
                <th className="py-3.5 px-4 font-semibold w-56">Utilization %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading storage resources...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No storage resources match the filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name & ID */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white font-sans text-sm flex items-center gap-2">
                        {res.type === "bucket" ? (
                          <Database className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <HardDrive className="w-4 h-4 text-emerald-400" />
                        )}
                        {res.name}
                      </div>
                      <div className="text-slate-400 text-[11px]">{res.id}</div>
                    </td>

                    {/* Provider */}
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: PROVIDER_COLORS[res.provider.toLowerCase()] }}
                      >
                        {res.provider}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 font-sans capitalize text-slate-300">
                      {res.type}
                    </td>

                    {/* Region / Tier */}
                    <td className="py-3.5 px-4 font-sans text-slate-300">
                      <div>{res.region}</div>
                      <div className="text-[11px] text-slate-400">{res.storage_class}</div>
                    </td>

                    {/* Provisioned GB */}
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {res.provisioned_gb.toLocaleString()} GB
                      <div className="text-[11px] text-slate-400">Used: {res.used_gb.toLocaleString()} GB</div>
                    </td>

                    {/* Utilization Progress Bar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-between mb-1 text-[11px]">
                        <span
                          className={`font-semibold ${
                            res.used_percent >= 85
                              ? "text-red-400 font-bold"
                              : res.used_percent >= 70
                              ? "text-amber-400"
                              : "text-slate-200"
                          }`}
                        >
                          {res.used_percent}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            res.used_percent >= 85
                              ? "bg-red-500"
                              : res.used_percent >= 70
                              ? "bg-amber-500"
                              : "bg-indigo-500"
                          }`}
                          style={{ width: `${Math.min(100, res.used_percent)}%` }}
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
