export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function fetchJson(endpoint, options = {}) {
  const url = `${API_URL}/api${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`API error ${res.status}: ${errBody || res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`Fetch failed for ${url}:`, err);
    throw err;
  }
}

export const api = {
  ping: () => fetchJson("/ping"),
  getOverview: (provider) => {
    const p = provider && provider !== "all" ? `?provider=${provider}` : "";
    return fetchJson(`/overview${p}`);
  },

  getCompute: (provider) => {
    const p = provider && provider !== "all" ? `?provider=${provider}` : "";
    return fetchJson(`/compute${p}`);
  },

  getStorage: (provider) => {
    const p = provider && provider !== "all" ? `?provider=${provider}` : "";
    return fetchJson(`/storage${p}`);
  },

  getNetwork: (provider) => {
    const p = provider && provider !== "all" ? `?provider=${provider}` : "";
    return fetchJson(`/network${p}`);
  },

  getCosts: (provider, days = 30) => {
    const params = new URLSearchParams();
    if (provider && provider !== "all") params.append("provider", provider);
    if (days) params.append("days", days.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJson(`/costs${query}`);
  },

  getHealth: (provider) => {
    const p = provider && provider !== "all" ? `?provider=${provider}` : "";
    return fetchJson(`/health${p}`);
  },

  getAlerts: (provider, severity, acknowledged) => {
    const params = new URLSearchParams();
    if (provider && provider !== "all") params.append("provider", provider);
    if (severity && severity !== "all") params.append("severity", severity);
    if (acknowledged !== undefined && acknowledged !== null) {
      params.append("acknowledged", acknowledged.toString());
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return fetchJson(`/alerts${query}`);
  },

  acknowledgeAlert: (alertId) => {
    return fetchJson(`/alerts/${alertId}/acknowledge`, { method: "POST" });
  },

  getBudgets: (provider) => {
    const p = provider && provider !== "all" ? `?provider=${provider}` : "";
    return fetchJson(`/budget${p}`);
  },

  updateBudget: (provider, monthlyBudget) => {
    return fetchJson(`/budget`, {
      method: "PUT",
      body: JSON.stringify({ provider, monthly_budget: Number(monthlyBudget) }),
    });
  },

  simulateIncident: (payload = {}) => {
    return fetchJson(`/simulate-incident`, {
      method: "POST",
      body: JSON.stringify({
        provider: payload.provider || "aws",
        service_name: payload.service_name || "Amazon Elastic Compute Cloud (EC2)",
        cost_multiplier: payload.cost_multiplier || 1.6,
        cpu_spike: payload.cpu_spike !== false,
      }),
    });
  },

  resetIncident: () => {
    return fetchJson(`/simulate-incident/reset`, { method: "POST" });
  },

  getIncidentStatus: () => {
    return fetchJson(`/simulate-incident/status`);
  },
};
