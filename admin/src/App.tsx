import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Queue from "./pages/Queue";
import AddPhoto from "./pages/AddPhoto";
import Archive from "./pages/Archive";
import Templates from "./pages/Templates";
import BestTimes from "./pages/BestTimes";
import Analytics from "./pages/Analytics";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
// Orchestrator pages
import OrchestratorDashboard from "./pages/OrchestratorDashboard";
import Assets from "./pages/Assets";
import TimeSlots from "./pages/TimeSlots";
import OrchestratorRules from "./pages/OrchestratorRules";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="queue" element={<Queue />} />
          <Route path="add" element={<AddPhoto />} />
          <Route path="archive" element={<Archive />} />
          <Route path="templates" element={<Templates />} />
          <Route path="best-times" element={<BestTimes />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="settings" element={<Settings />} />
          {/* Orchestrator routes */}
          <Route path="orchestrator" element={<OrchestratorDashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="time-slots" element={<TimeSlots />} />
          <Route path="orchestrator-rules" element={<OrchestratorRules />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
