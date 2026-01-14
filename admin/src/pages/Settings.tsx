import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Settings() {
  const [tokenStatus, setTokenStatus] = useState<{
    valid: boolean;
    accountName?: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const checkToken = async () => {
    setLoading(true);
    try {
      const result = await api.validateInstagramToken();
      setTokenStatus({
        valid: true,
        accountName: result.account.name,
      });
    } catch (err) {
      setTokenStatus({
        valid: false,
        error: err instanceof Error ? err.message : "Token geçersiz",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-gray-500 mt-1">Sistem yapılandırması</p>
      </div>

      {/* Instagram Token */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Instagram Bağlantısı</h2>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="font-medium text-gray-900">Access Token</p>
            {loading ? (
              <p className="text-sm text-gray-500">Kontrol ediliyor...</p>
            ) : tokenStatus?.valid ? (
              <p className="text-sm text-green-600">
                Bağlı: {tokenStatus.accountName}
              </p>
            ) : (
              <p className="text-sm text-red-600">
                {tokenStatus?.error || "Bağlantı yok"}
              </p>
            )}
          </div>
          <button
            onClick={checkToken}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            {loading ? "..." : "Kontrol Et"}
          </button>
        </div>

        <div className="mt-4 p-4 bg-brand-yellow/10 rounded-xl">
          <p className="text-sm text-gray-600">
            <strong>Not:</strong> Token'ı yenilemek için Firebase Console'dan{" "}
            <code className="bg-gray-100 px-1 rounded">functions:config:set</code>{" "}
            komutunu kullanın.
          </p>
        </div>
      </div>

      {/* Scheduler Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Otomatik Paylaşım</h2>

        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Zamanlama</span>
            <span className="font-medium">Her gün 09:00</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Timezone</span>
            <span className="font-medium">Europe/Istanbul</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">AI Enhancement</span>
            <span className="font-medium">Opsiyonel</span>
          </div>
        </div>
      </div>

      {/* API Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">API Bilgileri</h2>

        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Region</span>
            <span className="font-medium font-mono text-sm">europe-west1</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Project ID</span>
            <span className="font-medium font-mono text-sm">instagram-automation-ad77b</span>
          </div>
        </div>
      </div>

      {/* Version */}
      <div className="text-sm text-gray-400">
        Admin Panel v1.0.0 | Storyflow v1.0.0
      </div>
    </div>
  );
}
