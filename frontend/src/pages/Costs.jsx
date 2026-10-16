import React, { useEffect, useState, useMemo } from "react";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Edit2,
  Check,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { useCloud } from "../context/CloudContext";
import { api } from "../api";

const PROVIDER_COLORS = {
  aws: "#FF9900",
  azure: "#0089D6",
  gcp: "#34A853",
};

export default function Costs() {
  const { provider, refreshKey } = useCloud();
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("daily"); // "daily" | "monthly"
  const [editingBudget, setEditingBudget] = useState(null); // { provider: 'aws', value: 14000 }
  const [updatingBudget, setUpdatingBudget] = useState(false);

  const fetchCosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCosts(provider, 30);
      setCostData(data);
    } catch (err) {
      setError(err.message || "Failed to load cost intelligence");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, [provider, refreshKey]);

  // Handle saving new budget
  const handleSaveBudget = async () => {
    if (!editingBudget) return;
    setUpdatingBudget(true);
    try {
      await api.updateBudget(editingBudget.provider, editingBudget.value);
      setEditingBudget(null);
      await fetchCosts();
    } catch (err) {
      alert("Failed to update budget: " + err.message);
    } finally {
      setUpdatingBudget(false);
    }
  };

  // Budget status cards
  const budgetList = useMemo(() => {
    if (!costData?.budget_status) return [];
    return Object.values(costData.budget_status);
  }, [costData]);

  // Check if any budget breached or near threshold
  const criticalBudgets = budgetList.filter((b) => b.percent_used >= 100.0);
  const warningBudgets = budgetList.filter((b) => b.percent_used >= 80.0 && b.percent_used < 100.0);

  // Daily spend series
  const dailySeries = costData?.daily_costs || [];

  // Monthly breakdown data for Bar Chart
  const serviceBreakdown = costData?.service_breakdown || [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Cost Intelligence & Cloud Budgets
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Unified billing analytics, 30-day run rates, and active budget policy enforcement.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "daily" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Daily Spend Trend
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "monthly" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Service Cost Breakdown
          </button>
        </div>
      </div>

      {/* Budget Breach / Warning Banners */}
      {criticalBudgets.length > 0 && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/50 flex items-start space-x-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-red-300 text-sm">Critical Budget Breach Detected!</h3>
            {criticalBudgets.map((b) => (
              <p key={b.provider} className="text-xs text-red-200">
                • <strong>{b.provider.toUpperCase()}</strong> has consumed ${b.current_spend.toLocaleString()} (
                {b.percent_used}% of allocated ${b.monthly_budget.toLocaleString()}).
              </p>
            ))}
          </div>
        </div>
      )}

      {warningBudgets.length > 0 && criticalBudgets.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-amber-300 text-sm">Approaching Budget Threshold (80%+)</h3>
            {warningBudgets.map((b) => (
              <p key={b.provider} className="text-xs text-amber-200">
                • <strong>{b.provider.toUpperCase()}</strong> spend is at {b.percent_used}% ($
                {b.current_spend.toLocaleString()} of ${b.monthly_budget.toLocaleString()}).
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Cloud Budget Progress Cards with Inline Edit */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {budgetList.map((b) => {
          const isEditing = editingBudget?.provider === b.provider;
          const pColor = PROVIDER_COLORS[b.provider.toLowerCase()] || "#6366f1";
          return (
            <div key={b.provider} className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pColor }}></span>
                  <span className="font-bold text-white text-base uppercase">{b.provider} Budget</span>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setEditingBudget({ provider: b.provider, value: b.monthly_budget })}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Edit Monthly Budget"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleSaveBudget}
                      disabled={updatingBudget}
                      className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-xs"
                      title="Save"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setEditingBudget(null)}
                      className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white text-xs"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-baseline justify-between text-xs text-slate-400 mb-1">
                  <span>Actual Spend</span>
                  <span>Target Limit</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white font-mono">
                    ${b.current_spend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-sm">$</span>
                      <input
                        type="number"
                        value={editingBudget.value}
                        onChange={(e) =>
                          setEditingBudget({ ...editingBudget, value: Number(e.target.value) })
                        }
                        className="w-24 px-2 py-1 text-xs bg-slate-950 border border-indigo-500 rounded text-white font-mono focus:outline-none"
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-slate-300 font-mono">
                      ${b.monthly_budget.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span
                    className={
                      b.percent_used >= 100
                        ? "text-red-400"
                        : b.percent_used >= 80
                        ? "text-amber-400"
                        : "text-slate-300"
                    }
                  >
                    {b.percent_used}% utilized
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Projected: ${b.projected_spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      b.percent_used >= 100
                        ? "bg-red-500"
                        : b.percent_used >= 80
                        ? "bg-amber-500"
                        : "bg-indigo-500"
                    }`}
                    style={{ width: `${Math.min(100, b.percent_used)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Chart Section */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              {viewMode === "daily" ? "Daily Run Rate (Past 30 Days)" : "Top Services by Spend"}
            </h2>
            <p className="text-xs text-slate-400">
              {viewMode === "daily"
                ? "Daily multi-cloud operational expense"
                : "Granular breakdown of cloud services and storage/compute fees"}
            </p>
          </div>
        </div>

        {viewMode === "daily" ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySeries.filter((_, idx) => idx % 2 === 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name) => [`$${Number(val).toFixed(2)}`, name.toUpperCase()]}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                />
                <Legend wrapperStyle={{ paddingTop: "10px" }} />
                <Bar dataKey="aws" name="AWS" stackId="a" fill={PROVIDER_COLORS.aws} />
                <Bar dataKey="azure" name="Azure" stackId="a" fill={PROVIDER_COLORS.azure} />
                <Bar dataKey="gcp" name="GCP" stackId="a" fill={PROVIDER_COLORS.gcp} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={serviceBreakdown}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="service" stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip
                  formatter={(val) => [`$${Number(val).toLocaleString()}`, "Spend"]}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                />
                <Bar dataKey="cost" radius={[0, 6, 6, 0]}>
                  {serviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PROVIDER_COLORS[entry.provider] || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
