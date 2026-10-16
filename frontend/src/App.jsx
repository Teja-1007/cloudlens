import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CloudProvider } from "./context/CloudContext";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Overview from "./pages/Overview";
import Compute from "./pages/Compute";
import Storage from "./pages/Storage";
import Network from "./pages/Network";
import Costs from "./pages/Costs";
import Health from "./pages/Health";
import Alerts from "./pages/Alerts";

export default function App() {
  return (
    <CloudProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
          {/* Left Navigation Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <Topbar />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/compute" element={<Compute />} />
                <Route path="/storage" element={<Storage />} />
                <Route path="/network" element={<Network />} />
                <Route path="/costs" element={<Costs />} />
                <Route path="/health" element={<Health />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </CloudProvider>
  );
}
