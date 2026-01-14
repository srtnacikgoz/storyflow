import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { QueueItem } from "../types";

// Kategori label'ları
const categoryLabels: Record<string, string> = {
  viennoiserie: "Viennoiserie",
  coffee: "Kahve",
  chocolate: "Çikolata",
  "small-desserts": "Küçük Tatlılar",
  "slice-cakes": "Dilim Pastalar",
  "big-cakes": "Büyük Pastalar",
  profiterole: "Profiterol",
  "special-orders": "Özel Siparişler",
};

// Status badge renkleri
const statusColors: Record<string, string> = {
  pending: "bg-brand-yellow/20 text-yellow-800",
  processing: "bg-brand-blue/20 text-blue-800",
  completed: "bg-brand-green/20 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
};

export default function Queue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPendingItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kuyruk yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const processItem = async (itemId: string, skipEnhancement: boolean) => {
    setProcessing(itemId);
    try {
      await api.processQueueItem({ itemId, skipEnhancement });
      // Listeyi yenile
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kuyruk</h1>
          <p className="text-gray-500 mt-1">Paylaşım bekleyen fotoğraflar</p>
        </div>
        <button onClick={loadItems} className="btn-secondary">
          Yenile
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Liste */}
      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Kuyrukta bekleyen fotoğraf yok</p>
          <a href="/add" className="btn-primary inline-block mt-4">
            Fotoğraf Ekle
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card flex gap-4">
              {/* Thumbnail */}
              <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={item.originalUrl}
                  alt={item.productName || "Fotoğraf"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/96?text=?";
                  }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 truncate">
                      {item.productName || "İsimsiz"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {categoryLabels[item.productCategory] || item.productCategory}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      statusColors[item.status]
                    }`}
                  >
                    {statusLabels[item.status]}
                  </span>
                </div>

                {item.caption && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {item.caption}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => processItem(item.id, true)}
                    disabled={processing === item.id}
                    className="text-sm px-3 py-1.5 bg-brand-blue/20 text-gray-900 rounded-lg hover:bg-brand-blue/30 disabled:opacity-50"
                  >
                    {processing === item.id ? "İşleniyor..." : "Paylaş"}
                  </button>
                  <button
                    onClick={() => processItem(item.id, false)}
                    disabled={processing === item.id}
                    className="text-sm px-3 py-1.5 bg-brand-mustard/20 text-gray-900 rounded-lg hover:bg-brand-mustard/30 disabled:opacity-50"
                  >
                    AI ile Paylaş
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
