import { useState, useEffect } from "react";
import { api } from "../services/api";

interface GalleryItem {
  id: string;
  posterUrl: string;
  styleId: string;
  moodId: string;
  aspectRatioId: string;
  title: string;
  subtitle?: string;
  rating?: number;
  createdAt: number;
  cost?: { total: number };
  variationIndex?: number;
}

export default function PosterGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  useEffect(() => { loadGallery(); }, []);

  const loadGallery = async () => {
    setLoading(true);
    try {
      const data = await api.listPosterGallery(50);
      setItems(data as GalleryItem[]);
    } catch (err) {
      console.error("Galeri yüklenemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu poster silinecek. Emin misiniz?")) return;
    try {
      await api.deletePosterGalleryItem(id);
      setItems(prev => prev.filter(i => i.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
    } catch (err) {
      alert("Silme hatası");
    }
  };

  const handleDownload = (item: GalleryItem) => {
    const link = document.createElement("a");
    link.href = item.posterUrl;
    link.download = `poster_${item.styleId}_${item.id}.png`;
    link.target = "_blank";
    link.click();
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  // Stil bazlı filtreleme
  const uniqueStyles = [...new Set(items.map(i => i.styleId))];
  const filtered = filter === "all" ? items : items.filter(i => i.styleId === filter);

  // Puan rengi
  const ratingColor = (r?: number) => {
    if (!r) return "text-gray-300";
    if (r >= 4) return "text-emerald-500";
    if (r >= 3) return "text-amber-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Poster Galeri</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} poster üretildi</p>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            filter === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Tümü ({items.length})
        </button>
        {uniqueStyles.map(s => {
          const count = items.filter(i => i.styleId === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === s ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>Henüz poster üretilmemiş</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition group"
            >
              {/* Görsel */}
              <div
                className="relative cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <img
                  src={item.posterUrl}
                  alt={item.title}
                  className="w-full aspect-[2/3] object-cover"
                  loading="lazy"
                />
                {/* Puan badge */}
                {item.rating && (
                  <div className={`absolute top-2 right-2 bg-white/90 backdrop-blur rounded-full px-2 py-0.5 text-xs font-bold ${ratingColor(item.rating)}`}>
                    {"★".repeat(item.rating)}
                  </div>
                )}
              </div>

              {/* Bilgi */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400">{item.styleId}</span>
                  <span className="text-[10px] text-gray-400">{formatDate(item.createdAt)}</span>
                </div>

                {/* Aksiyonlar */}
                <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleDownload(item)}
                    className="flex-1 bg-gray-100 text-gray-600 py-1 rounded text-[10px] font-medium hover:bg-gray-200"
                  >
                    İndir
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-2 bg-red-50 text-red-500 py-1 rounded text-[10px] font-medium hover:bg-red-100"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Büyük Görüntüleme Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedItem(null)}>
          <div className="max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <img
              src={selectedItem.posterUrl}
              alt={selectedItem.title}
              className="w-full rounded-xl shadow-2xl"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => handleDownload(selectedItem)}
                className="flex-1 bg-white text-gray-900 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-100"
              >
                PNG İndir
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 bg-white/20 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-white/30"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
