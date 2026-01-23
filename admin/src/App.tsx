import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "./components/Layout";
// Global loading
import { LoadingProvider } from "./contexts/LoadingContext";
import { LoadingOverlay } from "./components/LoadingOverlay";

// Lazy loaded pages - sadece ihtiyaç duyulduğunda yüklenir
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Queue = lazy(() => import("./pages/Queue"));
const AddPhoto = lazy(() => import("./pages/AddPhoto"));
const Archive = lazy(() => import("./pages/Archive"));
const BestTimes = lazy(() => import("./pages/BestTimes"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
// Orchestrator pages
const OrchestratorDashboard = lazy(() => import("./pages/OrchestratorDashboard"));
const Assets = lazy(() => import("./pages/Assets"));
const TimeSlots = lazy(() => import("./pages/TimeSlots"));
const Themes = lazy(() => import("./pages/Themes"));
const AIMonitor = lazy(() => import("./pages/AIMonitor"));
const AIRules = lazy(() => import("./pages/AIRules"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Yükleniyor...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <LoadingProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="queue" element={<Suspense fallback={<PageLoader />}><Queue /></Suspense>} />
            <Route path="add" element={<Suspense fallback={<PageLoader />}><AddPhoto /></Suspense>} />
            <Route path="archive" element={<Suspense fallback={<PageLoader />}><Archive /></Suspense>} />
            <Route path="best-times" element={<Suspense fallback={<PageLoader />}><BestTimes /></Suspense>} />
            <Route path="analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
            <Route path="calendar" element={<Suspense fallback={<PageLoader />}><Calendar /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            {/* Orchestrator routes */}
            <Route path="orchestrator" element={<Suspense fallback={<PageLoader />}><OrchestratorDashboard /></Suspense>} />
            <Route path="assets" element={<Suspense fallback={<PageLoader />}><Assets /></Suspense>} />
            <Route path="time-slots" element={<Suspense fallback={<PageLoader />}><TimeSlots /></Suspense>} />
            <Route path="themes" element={<Suspense fallback={<PageLoader />}><Themes /></Suspense>} />
            <Route path="ai-monitor" element={<Suspense fallback={<PageLoader />}><AIMonitor /></Suspense>} />
            <Route path="ai-rules" element={<Suspense fallback={<PageLoader />}><AIRules /></Suspense>} />
          </Route>
        </Routes>
        {/* Global loading indicator */}
        <LoadingOverlay />
      </BrowserRouter>
    </LoadingProvider>
  );
}

export default App;
