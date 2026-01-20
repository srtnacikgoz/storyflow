import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { QueueItem } from "../types";
import { useLoadingOperation } from "../contexts/LoadingContext";

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
  scheduled: "bg-purple-100 text-purple-800",
  awaiting_approval: "bg-orange-100 text-orange-800",
  completed: "bg-brand-green/20 text-green-800",
  failed: "bg-red-100 text-red-800",
  rejected: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  processing: "İşleniyor",
  scheduled: "Zamanlandı",
  awaiting_approval: "Onay Bekliyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  rejected: "Reddedildi",
};

// AI Model label'ları
const aiModelLabels: Record<string, string> = {
  "gemini-flash": "Gemini Flash",
  "gemini-pro": "Gemini Pro",
  "none": "AI Kapalı",
};

// Stil label'ları
const styleLabels: Record<string, string> = {
  "pure-minimal": "Minimal",
  "lifestyle-moments": "Lifestyle",
  "rustic-warmth": "Rustic",
  "french-elegance": "French",
};

export default function Queue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();

  // Global loading hooks
  const { execute: executeDelete } = useLoadingOperation("queue-delete");
  const { execute: executeProcess } = useLoadingOperation("queue-process");

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
      const message = skipEnhancement
        ? "Telegram'a gonderiliyor..."
        : "AI ile isleniyor ve Telegram'a gonderiliyor...";

      await executeProcess(async () => {
        // Telegram onaylı paylaşım - önce Telegram'a gider, onay sonrası Instagram'a
        await api.processQueueWithApproval({ itemId, skipEnhancement });
        // Listeyi yenile
        await loadItems();
      }, message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Islem basarisiz");
    } finally {
      setProcessing(null);
    }
  };

  const handleEdit = (itemId: string) => {
    navigate(`/add?edit=${itemId}`);
  };

  const handleDelete = async (itemId: string) => {
    setDeleting(itemId);
    try {
      await executeDelete(async () => {
        await api.deleteQueueItem(itemId);
        setDeleteConfirm(null);
        await loadItems();
      }, "Siliniyor...");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme islemi basarisiz");
    } finally {
      setDeleting(null);
    }
  };

  // Düzenlenebilir durumlar
  const isEditable = (status: string) => {
    return ["pending", "failed", "rejected"].includes(status);
  };

  // Silinebilir durumlar (processing ve awaiting_approval hariç)
  const isDeletable = (status: string) => {
    return !["processing", "awaiting_approval"].includes(status);
  };

  // Tarih formatlama (kısa)
  const formatScheduledDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Paylaşım zamanı metni
  const getSchedulingText = (item: QueueItem) => {
    if (item.scheduledFor) {
      return formatScheduledDate(item.scheduledFor);
    }
    switch (item.schedulingMode) {
      case "optimal":
        return "En İyi Zaman";
      case "scheduled":
        return "Zamanlanacak";
      default:
        return "Hemen";
    }
  };

  // Paylaşım zamanı ikonu
  const getSchedulingIcon = (item: QueueItem) => {
    if (item.scheduledFor) return "📅";
    switch (item.schedulingMode) {
      case "optimal":
        return "⭐";
      case "scheduled":
        return "🕐";
      default:
        return "⚡";
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
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-800 underline mt-1"
          >
            Kapat
          </button>
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
            <div key={item.id} className="card">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-28 h-28 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={item.originalUrl}
                    alt={item.productName || "Fotoğraf"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://via.placeholder.com/112?text=?";
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Üst Satır: Başlık + Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {item.productName || "İsimsiz"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {categoryLabels[item.productCategory] || item.productCategory}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0 ${
                        statusColors[item.status]
                      }`}
                    >
                      {statusLabels[item.status]}
                    </span>
                  </div>

                  {/* Bilgi Etiketleri */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {/* Paylaşım Zamanı - En önemli */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                      {getSchedulingIcon(item)} {getSchedulingText(item)}
                    </span>

                    {/* AI Model */}
                    {item.aiModel && item.aiModel !== "none" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        🤖 {aiModelLabels[item.aiModel] || item.aiModel}
                      </span>
                    )}
                    {item.aiModel === "none" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        📷 Orijinal
                      </span>
                    )}

                    {/* Stil - sadece AI açıksa */}
                    {item.aiModel && item.aiModel !== "none" && item.styleVariant && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                        🎨 {styleLabels[item.styleVariant] || item.styleVariant}
                      </span>
                    )}

                    {/* Faithfulness - sadece AI açıksa */}
                    {item.aiModel && item.aiModel !== "none" && item.faithfulness !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                        🎯 {Math.round(item.faithfulness * 100)}%
                      </span>
                    )}

                    {/* Şablon */}
                    {item.captionTemplateName && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-mustard/20 text-brand-mustard rounded text-xs">
                        📋 {item.captionTemplateName}
                      </span>
                    )}
                  </div>

                  {/* Caption Preview */}
                  {item.caption && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-1 italic">
                      "{item.caption}"
                    </p>
                  )}
                </div>
              </div>

              {/* Aksiyon Butonları - Ayrı satırda */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
                {/* İşlem butonları - sadece pending durumunda */}
                {item.status === "pending" && (
                  <>
                    <button
                      onClick={() => processItem(item.id, true)}
                      disabled={processing === item.id}
                      className="text-sm px-3 py-1.5 bg-brand-blue/20 text-gray-900 rounded-lg hover:bg-brand-blue/30 disabled:opacity-50"
                    >
                      {processing === item.id ? "Gönderiliyor..." : "Onayla ve Paylaş"}
                    </button>
                    <button
                      onClick={() => processItem(item.id, false)}
                      disabled={processing === item.id}
                      className="text-sm px-3 py-1.5 bg-brand-mustard/20 text-gray-900 rounded-lg hover:bg-brand-mustard/30 disabled:opacity-50"
                    >
                      AI + Onayla
                    </button>
                  </>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Edit butonu */}
                {isEditable(item.status) && (
                  <button
                    onClick={() => handleEdit(item.id)}
                    className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    ✏️ Düzenle
                  </button>
                )}

                {/* Delete butonu */}
                {isDeletable(item.status) && (
                  <>
                    {deleteConfirm === item.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-red-600">Emin misiniz?</span>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                          className="text-sm px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleting === item.id ? "Siliniyor..." : "Sil"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          disabled={deleting === item.id}
                          className="text-sm px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                        >
                          Iptal
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(item.id)}
                        className="text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        Sil
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
