import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, API_URL } from "../api";

const CloudContext = createContext();

export function CloudProvider({ children }) {
  const [provider, setProvider] = useState("all");
  const [theme, setTheme] = useState("dark");
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  const [countdown, setCountdown] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [incidentActive, setIncidentActive] = useState(false);
  const [incidentDetails, setIncidentDetails] = useState(null);
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [incidentLoading, setIncidentLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");

  // Apply dark mode class to document element
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setLastRefreshed(new Date().toLocaleTimeString());
    setCountdown(30);
  }, []);

  // Poll incident status and alert count
  const checkStatus = useCallback(async () => {
    try {
      const pingRes = await api.ping().catch(() => null);
      if (pingRes && pingRes.status === "ok") {
        setBackendStatus("connected");
      } else {
        setBackendStatus("offline");
      }

      const [incStatus, alerts] = await Promise.all([
        api.getIncidentStatus().catch(() => ({ active: false })),
        api.getAlerts().catch(() => []),
      ]);
      setIncidentActive(!!incStatus.active);
      setIncidentDetails(incStatus.incident || null);
      const unack = alerts.filter((a) => !a.acknowledged);
      setActiveAlertCount(unack.length);
    } catch (err) {
      console.warn("Failed to check background status", err);
      setBackendStatus("offline");
    }
  }, []);

  // Auto-refresh timer countdown (30 seconds)
  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerRefresh();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [triggerRefresh, checkStatus]);

  // Refetch alerts and incident whenever refreshKey updates
  useEffect(() => {
    checkStatus();
  }, [refreshKey, checkStatus]);

  const runSimulateIncident = async (payload = {}) => {
    setIncidentLoading(true);
    try {
      const res = await api.simulateIncident(payload);
      setIncidentActive(true);
      setIncidentDetails(res.incident_details);
      triggerRefresh();
      return res;
    } catch (err) {
      console.error("Failed to simulate incident", err);
      throw err;
    } finally {
      setIncidentLoading(false);
    }
  };

  const runResetIncident = async () => {
    setIncidentLoading(true);
    try {
      const res = await api.resetIncident();
      setIncidentActive(false);
      setIncidentDetails(null);
      triggerRefresh();
      return res;
    } catch (err) {
      console.error("Failed to reset incident", err);
      throw err;
    } finally {
      setIncidentLoading(false);
    }
  };

  return (
    <CloudContext.Provider
      value={{
        provider,
        setProvider,
        theme,
        toggleTheme,
        lastRefreshed,
        countdown,
        refreshKey,
        triggerRefresh,
        incidentActive,
        incidentDetails,
        activeAlertCount,
        incidentLoading,
        backendStatus,
        apiUrl: API_URL,
        simulateIncident: runSimulateIncident,
        resetIncident: runResetIncident,
      }}
    >
      {children}
    </CloudContext.Provider>
  );
}

export function useCloud() {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error("useCloud must be used within CloudProvider");
  return ctx;
}
