import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useLoading } from "../../contexts/LoadingContext";

export default function InstagramSection() {
  const { startLoading, stopLoading } = useLoading();
  const [tokenStatus, setTokenStatus] = useState<{
    valid: boolean;
    accountName?: string;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const checkToken = async () => {
    setLoading(true);
    startLoading("settings", "Ayarlar yükleniyor...");
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
      stopLoading("settings");
    }
  };

  // İlk yüklemede kontrol et
  useEffect(() => {
    checkToken();
  }, []);

  return (
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
  );
}
