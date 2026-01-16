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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
