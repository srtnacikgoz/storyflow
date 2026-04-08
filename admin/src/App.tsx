import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Layout from "./components/Layout";
// Global loading
import { LoadingProvider } from "./contexts/LoadingContext";
import { LoadingOverlay } from "./components/LoadingOverlay";

// Landing page (public)
const LandingPage = lazy(() => import("./pages/LandingPage"));

// Lazy loaded pages - sadece ihtiyaç duyulduğunda yüklenir
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Settings = lazy(() => import("./pages/Settings"));

// Orchestrator pages
const OrchestratorDashboard = lazy(() => import("./pages/OrchestratorDashboard"));
const Assets = lazy(() => import("./pages/Assets"));
const TimeSlots = lazy(() => import("./pages/TimeSlots"));
// Themes sayfası kaldırıldı — tüm ayarlar Senaryolar'a taşındı
const AIMonitor = lazy(() => import("./pages/AIMonitor"));
const AIRules = lazy(() => import("./pages/AIRules"));
const Scenarios = lazy(() => import("./pages/Scenarios"));
const Categories = lazy(() => import("./pages/Categories"));
const Styles = lazy(() => import("./pages/Styles"));
const PromptStudio = lazy(() => import("./pages/PromptStudio"));
const RuleEngine = lazy(() => import("./pages/RuleEngine"));
const AITerminology = lazy(() => import("./pages/AITerminology"));
const Ideas = lazy(() => import("./pages/Ideas"));
const Enhance = lazy(() => import("./pages/Enhance"));
const Poster = lazy(() => import("./pages/Poster"));
const PosterGallery = lazy(() => import("./pages/PosterGallery"));
const QRCode = lazy(() => import("./pages/QRCode"));
const StyleStudio = lazy(() => import("./pages/StyleStudio"));
const CarouselStudio = lazy(() => import("./pages/CarouselStudio"));
const MenuPoster = lazy(() => import("./pages/MenuPoster"));
const KahvePoster = lazy(() => import("./pages/KahvePoster"));
const CikolataPoster = lazy(() => import("./pages/CikolataPoster"));

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
          {/* Public landing page */}
          <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />

          {/* Admin panel (sidebar + authenticated) */}
          <Route path="/admin" element={<Layout />}>
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            {/* Orchestrator routes */}
            <Route path="orchestrator" element={<Suspense fallback={<PageLoader />}><OrchestratorDashboard /></Suspense>} />
            <Route path="assets" element={<Suspense fallback={<PageLoader />}><Assets /></Suspense>} />
            <Route path="time-slots" element={<Suspense fallback={<PageLoader />}><TimeSlots /></Suspense>} />
            {/* themes route kaldırıldı — tüm ayarlar Senaryolar'a taşındı */}
            <Route path="ai-monitor" element={<Suspense fallback={<PageLoader />}><AIMonitor /></Suspense>} />
            <Route path="ai-rules" element={<Suspense fallback={<PageLoader />}><AIRules /></Suspense>} />
            <Route path="scenarios" element={<Suspense fallback={<PageLoader />}><Scenarios /></Suspense>} />
            <Route path="categories" element={<Suspense fallback={<PageLoader />}><Categories /></Suspense>} />
            <Route path="styles" element={<Suspense fallback={<PageLoader />}><Styles /></Suspense>} />
            <Route path="prompt-studio" element={<Suspense fallback={<PageLoader />}><PromptStudio /></Suspense>} />
            <Route path="rule-engine" element={<Suspense fallback={<PageLoader />}><RuleEngine /></Suspense>} />
            <Route path="ai-terminology" element={<Suspense fallback={<PageLoader />}><AITerminology /></Suspense>} />
            <Route path="ideas" element={<Suspense fallback={<PageLoader />}><Ideas /></Suspense>} />
            <Route path="enhance" element={<Suspense fallback={<PageLoader />}><Enhance /></Suspense>} />
            <Route path="poster" element={<Suspense fallback={<PageLoader />}><Poster /></Suspense>} />
            <Route path="poster/menu" element={<Suspense fallback={<PageLoader />}><MenuPoster /></Suspense>} />
            <Route path="poster/kahve" element={<Suspense fallback={<PageLoader />}><KahvePoster /></Suspense>} />
            <Route path="poster/cikolata" element={<Suspense fallback={<PageLoader />}><CikolataPoster /></Suspense>} />
            <Route path="poster-gallery" element={<Suspense fallback={<PageLoader />}><PosterGallery /></Suspense>} />
            <Route path="qr-code" element={<Suspense fallback={<PageLoader />}><QRCode /></Suspense>} />
            <Route path="style-studio" element={<Suspense fallback={<PageLoader />}><StyleStudio /></Suspense>} />
            <Route path="carousel-studio" element={<Suspense fallback={<PageLoader />}><CarouselStudio /></Suspense>} />
            {/* composition-templates route kaldırıldı — slot konfigürasyonu Senaryolar'a taşındı */}
          </Route>
        </Routes>
        {/* Global loading indicator */}
        <LoadingOverlay />
      </BrowserRouter>
    </LoadingProvider>
  );
}

export default App;
