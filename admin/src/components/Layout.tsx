import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useLoading } from "../contexts/LoadingContext";

export default function Layout() {
  const { lastPageLoadInfo, clearPageLoadInfo } = useLoading();

  // Sayfa yüklenme süresi alert'i
  useEffect(() => {
    if (lastPageLoadInfo) {
      const { durationMs, operationId } = lastPageLoadInfo;

      // Süreyi formatla
      const seconds = (durationMs / 1000).toFixed(2);

      // Alert göster
      alert(`✅ "${operationId}" ${seconds} saniyede yüklendi (${durationMs}ms)`);

      // Bilgiyi temizle (tekrar alert göstermesin)
      clearPageLoadInfo();
    }
  }, [lastPageLoadInfo, clearPageLoadInfo]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
