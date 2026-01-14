import { useEffect, useState } from "react";
import { api } from "../services/api";

interface ArchiveItem {
  id: string;
  originalUrl: string;
  enhancedUrl?: string;
  productCategory: string;
  productName?: string;
  caption: string;
  aiModel: string;
  styleVariant: string;
  faithfulness: number;
  isEnhanced?: boolean;
  storyId?: string;
  uploadedAt: string;
}

export default function Archive() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCompletedItems(50);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  // AI Model label
  const getAiModelLabel = (model: string) => {
    switch (model) {
      case "gemini-flash":
        return "Gemini Flash";
      case "gemini-pro":
        return "Gemini Pro";
      case "none":
        return "AI Kapalı";
      default:
        return model;
    }
  };

  // Stil label
  const getStyleLabel = (style: string) => {
    switch (style) {
      case "pure-minimal":
        return "Pure Minimal";
      case "lifestyle-moments":
        return "Lifestyle";
      case "rustic-warmth":
        return "Rustic";
      case "french-elegance":
        return "French";
      default:
        return style;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200">
        <p className="text-red-600">{error}</p>
        <button onClick={loadData} className="btn-secondary mt-4">
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Arşiv</h1>
          <p className="text-gray-500 mt-1">Paylaşılan görseller ve detayları</p>
        </div>
        <button onClick={loadData} className="btn-secondary">
          Yenile
        </button>
      </div>

      {/* Items Grid */}
      {items.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">Henüz paylaşılan görsel yok</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="card cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedItem(item)}
            >
              {/* Görsel */}
              <div className="relative aspect-[9/16] mb-3 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={item.enhancedUrl || item.originalUrl}
                  alt={item.productName || "Story"}
                  className="w-full h-full object-cover"
                />
                {item.isEnhanced && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                    AI
                  </span>
                )}
              </div>

              {/* Bilgiler */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {item.productName || item.productCategory}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(item.uploadedAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>

                {item.caption && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    "{item.caption}"
                  </p>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                    {getAiModelLabel(item.aiModel)}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                    {getStyleLabel(item.styleVariant)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Detaylar</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Görseller Karşılaştırma */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Orijinal</p>
                  <div className="aspect-[9/16] rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={selectedItem.originalUrl}
                      alt="Orijinal"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    {selectedItem.isEnhanced ? "AI Enhanced" : "Paylaşılan"}
                  </p>
                  <div className="aspect-[9/16] rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={selectedItem.enhancedUrl || selectedItem.originalUrl}
                      alt="Enhanced"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Detay Bilgileri */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Ürün</p>
                    <p className="font-medium">{selectedItem.productName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kategori</p>
                    <p className="font-medium">{selectedItem.productCategory}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Girilen Caption</p>
                  <p className="font-medium p-3 bg-gray-50 rounded-lg mt-1">
                    {selectedItem.caption || "(Boş)"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">AI Model</p>
                    <p className="font-medium">{getAiModelLabel(selectedItem.aiModel)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stil</p>
                    <p className="font-medium">{getStyleLabel(selectedItem.styleVariant)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sadakat</p>
                    <p className="font-medium">{Math.round(selectedItem.faithfulness * 100)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Tarih</p>
                    <p className="font-medium">
                      {new Date(selectedItem.uploadedAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Instagram Story ID</p>
                    <p className="font-medium font-mono text-xs">
                      {selectedItem.storyId || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
